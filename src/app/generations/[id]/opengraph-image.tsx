import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

// Image metadata
export const alt = "Generated Character";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Image generation
export default async function Image({ params }: { params: { id: string } }) {
  try {
    // Fetch image from database
    const image = await db
      .selectFrom("generatedImages")
      .select(["imageDataUrl", "userPfpUrl", "status"])
      .where("id", "=", params.id)
      .executeTakeFirst();

    if (!image) {
      return new ImageResponse(
        (
          <div
            style={{
              fontSize: 60,
              background: "white",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Image not found
          </div>
        ),
        size
      );
    }

    if (image.status !== "completed") {
      return new ImageResponse(
        (
          <div
            style={{
              fontSize: 60,
              background: "white",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Image not ready
          </div>
        ),
        size
      );
    }

    if (!image.imageDataUrl || !image.userPfpUrl) {
      return new ImageResponse(
        (
          <div
            style={{
              fontSize: 60,
              background: "white",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Image data not available
          </div>
        ),
        size
      );
    }

    // Fetch both images
    const [sourceImage, generatedImage] = await Promise.all([
      fetch(image.userPfpUrl).then((res) => res.arrayBuffer()),
      fetch(image.imageDataUrl).then((res) => res.arrayBuffer()),
    ]);

    return new ImageResponse(
      (
        <div
          style={{
            background: "white",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "60px",
            padding: "40px",
          }}
        >
          {/* Source Image */}
          <img
            src={image.userPfpUrl}
            alt="Source"
            width={400}
            height={400}
            style={{
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />

          {/* Arrow */}
          <div
            style={{
              fontSize: 120,
              color: "#666",
              display: "flex",
              alignItems: "center",
            }}
          >
            →
          </div>

          {/* Generated Image */}
          <img
            src={image.imageDataUrl}
            alt="Generated"
            width={400}
            height={400}
            style={{
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        </div>
      ),
      {
        ...size,
        headers: {
          "Cache-Control": "public, max-age=31536000",
        },
      }
    );
  } catch (error) {
    console.error("Error generating OpenGraph image:", error);
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 60,
            background: "white",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Error generating image
        </div>
      ),
      size
    );
  }
}
