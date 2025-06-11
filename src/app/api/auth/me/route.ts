import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyJwtToken } from "@/lib/siwe-auth";

export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request);

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = verifyJwtToken(token);

    return NextResponse.json({
      authenticated: true,
      user: {
        address: user.address,
        chainId: user.chainId,
      },
    });
  } catch (error) {
    console.error("Error checking auth status:", error);
    return NextResponse.json(
      { authenticated: false, error: "Invalid token" },
      { status: 401 }
    );
  }
}
