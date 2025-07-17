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

    // Apply similar truncation logic as ThemeSelector
    let promptLabel = image.promptText;

    return new ImageResponse(
      (
        <div
          style={{
            background: "#FFFFFF",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            padding: "40px",
            position: "relative",
          }}
        >
          {/* Splash logo in top left */}
          <img
            src={`${process.env.APP_URL}/splash.png`}
            alt="Logo"
            width={80}
            height={80}
            style={{
              position: "absolute",
              top: "20px",
              left: "20px",
              borderRadius: "8px",
            }}
          />
          {/* Source Image */}
          <img
            src={image.userPfpUrl}
            alt="Source"
            width={312}
            height={312}
            style={{
              borderRadius: "12px",
              objectFit: "cover",
              position: "absolute",
              top: "180px",
              left: "180px",
            }}
          />

          {/* Generated Image */}
          <img
            src={image.imageDataUrl}
            alt="Generated"
            width={312}
            height={312}
            style={{
              borderRadius: "12px",
              objectFit: "cover",
              position: "absolute",
              top: "180px",
              right: "180px",
            }}
          />

          {/* Arrow between images */}
          <img
            src={`${process.env.APP_URL}/arrow.svg`}
            alt="Arrow"
            width={100}
            style={{
              position: "absolute",
              top: "340px",
              left: "600px",
              transform: "translate(-50%, -50%)",
            }}
          />
          {promptLabel && (
            <div
              style={{
                fontSize: 36,
                color: "#464646",
                textAlign: "left",
                position: "absolute",
                top: "532px",
                left: "180px",
                right: "180px",
                lineHeight: "1.2",
                display: "flex",
              }}
            >
              <div style={{ display: "flex", flexDirection: "row" }}>
                {/* Vertical line as long as the text */}
                <div
                  style={{
                    width: "5px",
                    height: "100%",
                    backgroundColor: "#D1D1D1",
                    marginBottom: "10px",
                    borderRadius: "10px",
                  }}
                ></div>
                <div
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    textOverflow: "ellipsis",
                    marginLeft: "10px",
                  }}
                >
                  {promptLabel}
                </div>
              </div>
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
