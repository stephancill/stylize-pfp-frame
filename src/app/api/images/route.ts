import { SIWE_JWT_COOKIE_NAME } from "@/lib/constants";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/siwe-auth";
import { NextResponse } from "next/server";

export const GET = withAuth(async ({ user }) => {
  try {
    if (!user.id) {
      const response = NextResponse.json(
        { error: "Invalid user" },
        { status: 401 }
      );
      response.cookies.delete(SIWE_JWT_COOKIE_NAME);
      return response;
    }

    // Kysely automatically converts camelCase to snake_case for column names
    // if a CamelCasePlugin is used, otherwise ensure your column names match the DB.
    // Assuming camelCase plugin is in use based on user prompt.
    const completedImages = await db
      .selectFrom("generatedImages")
      .select([
        "id", // or quoteId if that's the unique identifier for an image item
        "imageDataUrl",
        "promptText",
        "createdAt",
        "status", // good for debugging, or if UI wants to re-verify
        "quoteId",
        "userPfpUrl",
      ])
      .where("userId", "ilike", user.id.toString().toLowerCase())
      .where("status", "=", "completed")
      .orderBy("createdAt", "desc")
      .execute();

    if (!completedImages || completedImages.length === 0) {
      return NextResponse.json(
        {
          message: "No completed images found for this user.",
          images: [],
          authenticatedUser: user.address, // Include for debugging
        },
        { status: 200 } // 200 or 404 depends on desired behavior for "no results"
      );
    }

    return NextResponse.json({
      images: completedImages,
      authenticatedUser: user.address, // Include for debugging
    });
  } catch (error) {
    console.error(
      `Error fetching completed images for userId ${user.fid}:`,
      error
    );
    let errorMessage = "Internal Server Error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
