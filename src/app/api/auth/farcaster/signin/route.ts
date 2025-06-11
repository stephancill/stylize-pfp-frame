import { NextRequest, NextResponse } from "next/server";
import {
  verifyFarcasterMessage,
  createFarcasterJwtToken,
} from "@/lib/siwe-auth";

export async function POST(request: NextRequest) {
  try {
    const { message, signature, challengeId } = await request.json();

    if (!message || !signature || !challengeId) {
      return NextResponse.json(
        { error: "Missing required fields: message, signature, challengeId" },
        { status: 400 }
      );
    }

    // Verify the Farcaster message and consume the challenge
    const { fid, nonce } = await verifyFarcasterMessage(
      message,
      signature,
      challengeId
    );

    // Create JWT token
    const token = createFarcasterJwtToken(fid, nonce);

    // Return the token in the response body for localStorage storage
    return NextResponse.json({
      success: true,
      token,
      user: {
        authType: "farcaster",
        fid,
      },
    });
  } catch (error) {
    console.error("Farcaster sign-in error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
