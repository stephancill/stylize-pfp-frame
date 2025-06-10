import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  args: { params: Promise<{ fid: string }> }
) {
  const params = await args.params;
  try {
    const userIdString = params.fid; // Keep the route parameter name for backward compatibility
    if (!userIdString) {
      return NextResponse.json(
        { error: "userId parameter is required." },
        { status: 400 }
      );
    }

    // userId can be either a numeric FID or a wallet address
    const userId = userIdString;

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
      ])
      .where("userId", "=", userId)
      .where("status", "=", "completed")
      .orderBy("createdAt", "desc")
      .execute();

    if (!completedImages || completedImages.length === 0) {
      return NextResponse.json(
        { message: "No completed images found for this user.", images: [] },
        { status: 200 } // 200 or 404 depends on desired behavior for "no results"
      );
    }

    return NextResponse.json({ images: completedImages });
  } catch (error) {
    console.error(
      `Error fetching completed images for userId ${params.fid}:`,
      error
    );
    let errorMessage = "Internal Server Error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
