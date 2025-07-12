import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import themes from "@/lib/themes";

// Image metadata
export const alt = "Generated Character";
export const size = {
  width: 1200,
  height: 800,
};

export const contentType = "image/png";

// Image generation
export default async function Image({ params }: { params: { id: string } }) {
  try {
    // Fetch image from database
    const image = await db
      .selectFrom("generatedImages")
      .select(["imageDataUrl", "userPfpUrl", "status", "promptText"])
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
      throw new Error("Image not ready");
    }

    if (!image.imageDataUrl || !image.userPfpUrl) {
      throw new Error("Image data not available");
    }

    const matchingTheme = themes.find(
      (t) => image.promptText?.trim() === t.prompt.trim()
    );

    // Apply similar truncation logic as ThemeSelector
    let promptLabel = "";
    if (matchingTheme) {
      // For matching themes, show the theme name
      promptLabel = matchingTheme.name;
    } else if (image.promptText) {
      // For custom prompts, truncate to first 100 characters
      promptLabel =
        image.promptText.length > 100
          ? image.promptText.substring(0, 100) + "..."
          : image.promptText;
    }

    return new ImageResponse(
      (
        <div
          style={{
            background: "white",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            padding: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "60px",
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
          {promptLabel && (
            <div
              style={{
                fontSize: 36,
                color: "#333",
                textAlign: "center",
                maxWidth: 1000,
                whiteSpace: "pre-wrap",
              }}
            >
              {promptLabel}
            </div>
          )}
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
