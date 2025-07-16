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
      .select(["id", "userPfpUrl", "status"])
      .where("id", "=", imageId)
      .executeTakeFirst();

    if (!image) {
      return new NextResponse("Image not found", { status: 404 });
    }

    if (!image.userPfpUrl) {
      return new NextResponse("Input image not available", { status: 404 });
    }

    // Check if userPfpUrl is a data URL (base64 encoded)
    if (image.userPfpUrl.startsWith("data:")) {
      // Extract the base64 data and content type
      const [mimeInfo, base64Data] = image.userPfpUrl.split(",");
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
      return NextResponse.redirect(image.userPfpUrl);
    }
  } catch (error) {
    console.error("Error serving input image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
