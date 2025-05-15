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
      .select(["imageDataUrl", "status"])
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

    // Convert base64 data URL to buffer
    const base64Data = image.imageDataUrl.split(",")[1];
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png", // Assuming PNG format since that's common for data URLs
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
