import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  args: { params: Promise<{ id: string }> }
) {
  const params = await args.params;
  try {
    const imageId = params.id;

    // Fetch image from database
    const image = await db
      .selectFrom("generatedImages")
      .select([
        "id",
        "imageDataUrl",
        "status",
        "promptText",
        "userPfpUrl",
        "createdAt",
        "quoteId",
      ])
      .where("id", "=", imageId)
      .executeTakeFirst();

    if (!image) {
      return new NextResponse("Image not found", { status: 404 });
    }

    if (image.status !== "completed") {
      return new NextResponse("Image not ready", { status: 400 });
    }

    if (!image.imageDataUrl) {
      return new NextResponse("Image data not available", { status: 404 });
    }

    // Return JSON data instead of image buffer
    return NextResponse.json({
      id: image.id,
      imageDataUrl: image.imageDataUrl,
      promptText: image.promptText,
      userPfpUrl: image.userPfpUrl,
      createdAt: image.createdAt,
      quoteId: image.quoteId,
      status: image.status,
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
