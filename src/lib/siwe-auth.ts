import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "./errors";
import {
  SIWE_JWT_COOKIE_NAME,
  SIWE_JWT_EXPIRES_IN,
  SIWE_NONCE_EXPIRY_SECONDS,
  SIWE_NONCE_REDIS_PREFIX,
} from "./constants";
import { redisCache } from "./redis";
import {
  generateSiweNonce,
  parseSiweMessage,
  type SiweMessage,
} from "viem/siwe";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { createAppClient, viemConnector } from "@farcaster/auth-client";

// Create a public client for SIWE verification
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Create Farcaster app client for verification
const farcasterAppClient = createAppClient({
  ethereum: viemConnector(),
});

// JWT Configuration
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "your-super-secret-jwt-key-change-this-in-production";

// Updated auth user interface to support both SIWE and Farcaster
export interface AuthUser {
  // SIWE fields
  address?: string;
  chainId?: number;
  // Farcaster fields
  fid?: number;
  // Common fields
  authType: "siwe" | "farcaster";
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
  id: string;
}

export interface JwtPayload extends AuthUser {
  iat: number;
  exp: number;
}

// Generate a nonce for SIWE message and store it in Redis
export async function generateNonce(): Promise<string> {
  const nonce = generateSiweNonce();

  const redisKey = `${SIWE_NONCE_REDIS_PREFIX}${nonce}`;

  // Store nonce in Redis with expiry
  await redisCache.setex(redisKey, SIWE_NONCE_EXPIRY_SECONDS, "1");

  return nonce;
}

// Validate and consume nonce from Redis
export async function validateAndConsumeNonce(nonce: string): Promise<boolean> {
  const redisKey = `${SIWE_NONCE_REDIS_PREFIX}${nonce}`;

  // Check if nonce exists
  const exists = await redisCache.get(redisKey);

  if (!exists) {
    return false;
  }

  // Delete nonce immediately after validation (single use)
  await redisCache.del(redisKey);

  return true;
}

// Create JWT token from SIWE message
export function createJwtToken(siweMessage: SiweMessage): string {
  const payload: AuthUser = {
    authType: "siwe",
    address: siweMessage.address.toLowerCase(),
    chainId: siweMessage.chainId,
    nonce: siweMessage.nonce,
    issuedAt: siweMessage.issuedAt?.toISOString(),
    expirationTime: siweMessage.expirationTime?.toISOString(),
    id: siweMessage.address.toLowerCase(),
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: SIWE_JWT_EXPIRES_IN,
  });
}

// Create JWT token from Farcaster auth
export function createFarcasterJwtToken(fid: number, nonce: string): string {
  const payload: AuthUser = {
    authType: "farcaster",
    fid,
    nonce,
    issuedAt: new Date().toISOString(),
    id: fid.toString(),
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: SIWE_JWT_EXPIRES_IN,
  });
}

// Verify JWT token and return user data
export function verifyJwtToken(token: string): AuthUser {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    return {
      authType: decoded.authType,
      address: decoded.address,
      chainId: decoded.chainId,
      fid: decoded.fid,
      id: decoded.id,
      nonce: decoded.nonce,
      issuedAt: decoded.issuedAt,
      expirationTime: decoded.expirationTime,
    };
  } catch (error) {
    throw new AuthError("Invalid or expired token");
  }
}

// Extract JWT token from Authorization header (prioritized) or cookies (fallback)
export function extractToken(request: NextRequest): string | null {
  // First try Authorization header (Bearer token)
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Fallback to cookie for backward compatibility
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((cookie) => {
        const [key, value] = cookie.trim().split("=");
        return [key, value];
      })
    );
    return cookies[SIWE_JWT_COOKIE_NAME] || null;
  }

  return null;
}

// Create HTTP-only cookie with JWT token
export function createAuthCookie(token: string): string {
  const isProduction = process.env.NODE_ENV === "production";

  return `${SIWE_JWT_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${
    7 * 24 * 60 * 60
  }; SameSite=Strict${isProduction ? "; Secure" : ""}`;
}

// Create cookie to clear auth
export function createClearAuthCookie(): string {
  return `${SIWE_JWT_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`;
}

// Types for the route handler with authenticated user
type NextContext = { params: Promise<Record<string, string | string[]>> };

export type AuthUserRouteHandler<
  T extends Record<string, object | string> = NextContext
> = (args: {
  req: NextRequest;
  user: AuthUser;
  context: T;
}) => Promise<Response>;

// withAuth decorator for protecting routes (supports both auth types)
export function withAuth<
  T extends Record<string, object | string> = NextContext
>(handler: AuthUserRouteHandler<T>) {
  return async (req: NextRequest, context: T): Promise<Response> => {
    try {
      const token = extractToken(req);

      if (!token) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const user = verifyJwtToken(token);

      // Optionally, you can add additional validation here
      // For example, check if the token is close to expiring and refresh it

      return handler({ req, user, context });
    } catch (error) {
      if (error instanceof AuthError) {
        // Unset the cookie
        req.cookies.delete(SIWE_JWT_COOKIE_NAME);
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      console.error("Unexpected error in withAuth:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

// Utility function to verify SIWE message and signature with nonce validation
export async function verifySiweMessage(
  message: string,
  signature: string
): Promise<SiweMessage> {
  try {
    // Parse the SIWE message first to get the nonce
    const parsedMessage = parseSiweMessage(message);

    // Get expected domain from APP_URL
    const appUrl =
      process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL
        ? `https://${process.env.VERCEL_BRANCH_URL}`
        : process.env.APP_URL!;
    const expectedDomain = new URL(appUrl).host;

    // First validate the nonce exists in Redis and consume it
    if (
      !parsedMessage.nonce ||
      !(await validateAndConsumeNonce(parsedMessage.nonce))
    ) {
      throw new AuthError("Invalid or expired nonce");
    }

    // Use viem's built-in verifySiweMessage function with domain and nonce validation
    const isValid = await publicClient.verifySiweMessage({
      message,
      signature: signature as `0x${string}`,
      domain: expectedDomain,
      nonce: parsedMessage.nonce,
    });

    if (!isValid) {
      throw new AuthError("Invalid SIWE message or signature");
    }

    // Ensure we have the required fields for our SiweMessage type
    if (
      !parsedMessage.address ||
      !parsedMessage.chainId ||
      !parsedMessage.domain ||
      !parsedMessage.uri
    ) {
      throw new AuthError("Incomplete SIWE message");
    }

    // Return a properly typed SiweMessage
    const siweMessage: SiweMessage = {
      address: parsedMessage.address,
      chainId: parsedMessage.chainId,
      domain: parsedMessage.domain,
      uri: parsedMessage.uri,
      version: parsedMessage.version || "1",
      nonce: parsedMessage.nonce,
      issuedAt: parsedMessage.issuedAt,
      expirationTime: parsedMessage.expirationTime,
      notBefore: parsedMessage.notBefore,
      requestId: parsedMessage.requestId,
      resources: parsedMessage.resources,
      scheme: parsedMessage.scheme,
      statement: parsedMessage.statement,
    };

    return siweMessage;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    console.error("SIWE verification error:", error);
    throw new AuthError("Failed to verify SIWE message");
  }
}

// Utility function to verify Farcaster message and signature with nonce validation
export async function verifyFarcasterMessage(
  message: string,
  signature: string,
  challengeId: string
): Promise<{ fid: number; nonce: string }> {
  try {
    // Parse the SIWE message first to get the nonce
    const parsedMessage = parseSiweMessage(message);

    // Get expected domain from APP_URL
    const appUrl = process.env.APP_URL!;
    const expectedDomain = new URL(appUrl).host;

    // First validate the nonce exists in Redis and consume it
    if (
      !parsedMessage.nonce ||
      !(await validateAndConsumeNonce(parsedMessage.nonce))
    ) {
      throw new AuthError("Invalid or expired nonce");
    }

    // Verify the Farcaster sign-in message
    const verifyResponse = await farcasterAppClient.verifySignInMessage({
      message,
      signature: signature as `0x${string}`,
      domain: expectedDomain,
      nonce: parsedMessage.nonce,
      acceptAuthAddress: true,
    });

    if (!verifyResponse.success) {
      console.log("verifyResponse", verifyResponse);
      throw new AuthError("Invalid Farcaster signature");
    }

    if (!verifyResponse.fid) {
      throw new AuthError("No FID found in verification response");
    }

    // Delete challenge immediately after validation (single use)
    await redisCache.del(`${SIWE_NONCE_REDIS_PREFIX}${challengeId}`);

    return {
      fid: verifyResponse.fid,
      nonce: parsedMessage.nonce,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    console.error("Farcaster verification error:", error);
    throw new AuthError("Failed to verify Farcaster message");
  }
}
