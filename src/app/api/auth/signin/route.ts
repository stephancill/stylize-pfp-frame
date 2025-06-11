import { NextRequest, NextResponse } from "next/server";
import {
  verifySiweMessage,
  createJwtToken,
  createAuthCookie,
} from "@/lib/siwe-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, signature } = body;

    if (!message || !signature) {
      return NextResponse.json(
        { error: "Message and signature are required" },
        { status: 400 }
      );
    }

    // Verify the SIWE message and signature
    const siweMessage = await verifySiweMessage(message, signature);

    // Create JWT token
    const token = createJwtToken(siweMessage);

    // Create response with auth cookie
    const response = NextResponse.json({
      success: true,
      user: {
        address: siweMessage.address,
        chainId: siweMessage.chainId,
      },
    });

    // Set the HTTP-only cookie
    response.headers.set("Set-Cookie", createAuthCookie(token));

    return response;
  } catch (error) {
    console.error("Error during SIWE sign-in:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Authentication failed";
    return NextResponse.json({ error: errorMessage }, { status: 401 });
  }
}
