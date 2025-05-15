import { ImageResponse } from "next/og";

// Image metadata
export const alt = "Stylize Your Profile Picture";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Image generation
export default async function Image() {
  try {
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
          {/* Profile Picture */}
          <div
            style={{
              width: 400,
              height: 400,
              paddingBottom: "35px",
              borderRadius: "50%",
              background: "linear-gradient(45deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 200,
              color: "white",
              transform: "rotate(90deg)",
            }}
          >
            :)
          </div>

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

          {/* Question Mark Circle */}
          <div
            style={{
              width: 400,
              height: 400,
              borderRadius: "50%",
              border: "8px dashed #6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 200,
              color: "#6366f1",
            }}
          >
            ?
          </div>
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
