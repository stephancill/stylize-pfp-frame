import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const image = await db
      .selectFrom("generatedImages")
      .select(["promptText", "userPfpUrl", "imageDataUrl", "status"])
      .where("id", "=", id)
      .executeTakeFirst();

    if (!image) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    if (image.status !== "completed") {
      return NextResponse.json(
        { error: "Image not completed yet" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      promptText: image.promptText,
      userPfpUrl: image.userPfpUrl,
      imageDataUrl: image.imageDataUrl,
    });
  } catch (error) {
    console.error("Failed to fetch image metadata", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}