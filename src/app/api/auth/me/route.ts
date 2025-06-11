import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyJwtToken } from "@/lib/siwe-auth";

export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request);

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = verifyJwtToken(token);

    // Return appropriate user data based on authentication type
    const userData =
      user.authType === "siwe"
        ? {
            authType: user.authType,
            address: user.address,
            chainId: user.chainId,
          }
        : {
            authType: user.authType,
            fid: user.fid,
          };

    return NextResponse.json({
      authenticated: true,
      user: userData,
    });
  } catch (error) {
    console.error("Error checking auth status:", error);
    return NextResponse.json(
      { authenticated: false, error: "Invalid token" },
      { status: 401 }
    );
  }
}
