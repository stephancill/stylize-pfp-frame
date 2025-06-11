import { NextResponse } from "next/server";
import { createClearAuthCookie } from "@/lib/siwe-auth";

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Signed out successfully",
    });

    // Clear the auth cookie
    response.headers.set("Set-Cookie", createClearAuthCookie());

    return response;
  } catch (error) {
    console.error("Error during sign-out:", error);
    return NextResponse.json({ error: "Failed to sign out" }, { status: 500 });
  }
}
