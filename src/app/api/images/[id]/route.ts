import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  args: { params: Promise<{ id: string }> }
) {
  const params = await args.params;
  const url = new URL(request.url);
  const format = url.searchParams.get('format');

  try {
    const imageId = params.id;

    // Fetch image from database with all necessary fields for sharing
    const image = await db
      .selectFrom("generatedImages")
      .select([
        "id",
        "imageDataUrl", 
        "status", 
        "promptText", 
        "userPfpUrl", 
        "createdAt",
        "quoteId"
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

    // If format=json, return JSON data for the share page
    if (format === 'json') {
      return NextResponse.json({
        id: image.id,
        imageDataUrl: image.imageDataUrl,
        promptText: image.promptText,
        userPfpUrl: image.userPfpUrl,
        createdAt: image.createdAt,
        quoteId: image.quoteId
      });
    }

    // Otherwise return the raw image (existing behavior)
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
