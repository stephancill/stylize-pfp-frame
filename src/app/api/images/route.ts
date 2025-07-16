import { SIWE_JWT_COOKIE_NAME } from "@/lib/constants";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/siwe-auth";
import { NextResponse } from "next/server";
import { getImageUrl, getInputImageUrl } from "@/lib/image-utils";

export const GET = withAuth(async ({ user, req }) => {
  try {
    if (!user.id) {
      const response = NextResponse.json(
        { error: "Invalid user" },
        { status: 401 }
      );
      response.cookies.delete(SIWE_JWT_COOKIE_NAME);
      return response;
    }

    // Parse query parameters for pagination
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "5");
    const offset = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalCountResult = await db
      .selectFrom("generatedImages")
      .select(db.fn.count("id").as("total"))
      .where("userId", "ilike", user.id.toString().toLowerCase())
      .where("status", "=", "completed")
      .executeTakeFirst();

    const totalCount = Number(totalCountResult?.total || 0);
    const totalPages = Math.ceil(totalCount / limit);

    // Kysely automatically converts camelCase to snake_case for column names
    // if a CamelCasePlugin is used, otherwise ensure your column names match the DB.
    // Assuming camelCase plugin is in use based on user prompt.
    const completedImages = await db
      .selectFrom("generatedImages")
      .select([
        "id", // or quoteId if that's the unique identifier for an image item
        "promptText",
        "createdAt",
        "status", // good for debugging, or if UI wants to re-verify
        "quoteId",
      ])
      .where("userId", "ilike", user.id.toString().toLowerCase())
      .where("status", "=", "completed")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    if (!completedImages || completedImages.length === 0) {
      return NextResponse.json(
        {
          message: "No completed images found for this user.",
          images: [],
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNextPage: false,
            hasPreviousPage: page > 1,
          },
          authenticatedUser: user.address, // Include for debugging
        },
        { status: 200 } // 200 or 404 depends on desired behavior for "no results"
      );
    }

    // Transform the images to include URLs instead of raw data
    const imagesWithUrls = completedImages.map((image) => ({
      ...image,
      imageDataUrl: getImageUrl(image.id),
      userPfpUrl: getInputImageUrl(image.id),
    }));

    return NextResponse.json({
      images: imagesWithUrls,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
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
