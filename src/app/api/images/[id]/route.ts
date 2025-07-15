import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getImageUrl, getInputImageUrl } from "@/lib/image-utils";

export async function GET(
  request: NextRequest,
  args: { params: Promise<{ id: string }> }
) {
  const params = await args.params;
  try {
    const imageId = params.id;

    // Check if the request wants JSON response
    const jsonSearch = request.nextUrl.searchParams.get("json");
    const acceptHeader = request.headers.get("accept");
    const wantsJson = jsonSearch || acceptHeader?.includes("application/json");

    if (wantsJson) {
      const image = await db
        .selectFrom("generatedImages")
        .select(["id", "status", "promptText", "createdAt", "quoteId"])
        .where("id", "=", imageId)
        .executeTakeFirst();

      if (!image) {
        return new NextResponse("Image not found", { status: 404 });
      }

      return NextResponse.json({
        id: image.id,
        imageDataUrl: getImageUrl(image.id),
        status: image.status,
        promptText: image.promptText,
        userPfpUrl: getInputImageUrl(image.id),
        createdAt: image.createdAt,
        quoteId: image.quoteId,
      });
    }

    // Fetch image from database
    const image = await db
      .selectFrom("generatedImages")
      .select(["id", "imageDataUrl", "status"])
      .where("id", "=", imageId)
      .executeTakeFirst();

    console.log(image);

    if (!image) {
      return new NextResponse("Image not found", { status: 404 });
    }

    if (image.status !== "completed") {
      return new NextResponse("Image not ready", { status: 400 });
    }

    if (!image.imageDataUrl) {
      return new NextResponse("Image data not available", { status: 404 });
    }

    // Check if imageDataUrl is a data URL (base64 encoded)
    if (image.imageDataUrl.startsWith("data:")) {
      // Extract the base64 data and content type
      const [mimeInfo, base64Data] = image.imageDataUrl.split(",");
      if (!base64Data) {
        return new NextResponse("Invalid image data", { status: 400 });
      }

      // Extract content type from data URL
      const mimeMatch = mimeInfo.match(/data:([^;]+)/);
      const contentType = mimeMatch ? mimeMatch[1] : "image/png";

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, "base64");

      // Return the image with appropriate headers
      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } else {
      // For regular URLs, redirect to the original URL
      return NextResponse.redirect(image.imageDataUrl);
    }
  } catch (error) {
    console.error("Error serving image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
