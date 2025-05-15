import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GeneratedImageRow } from "@/types/db"; // Assuming GeneratedImageRow includes all needed fields

export async function GET(
  request: Request,
  { params }: { params: { fid: string } }
) {
  try {
    const fidString = params.fid;
    if (!fidString) {
      return NextResponse.json(
        { error: "FID parameter is required." },
        { status: 400 }
      );
    }

    const fid = parseInt(fidString, 10);
    if (isNaN(fid)) {
      return NextResponse.json(
        { error: "Invalid FID parameter. Must be a number." },
        { status: 400 }
      );
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
      ])
      .where("fid", "=", fid)
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
      `Error fetching completed images for FID ${params.fid}:`,
      error
    );
    let errorMessage = "Internal Server Error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
