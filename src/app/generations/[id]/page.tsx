import { FRAME_METADATA } from "@/lib/constants";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ShareGenerationCard from "@/components/ShareGenerationCard";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { id } = params;

  return {
    title: "Stylize Me",
    description: "Stylize any image with AI",
    other: {
      "fc:frame": JSON.stringify({
        ...FRAME_METADATA,
        imageUrl: `${process.env.APP_URL}/generations/${id}/opengraph-image`,
      }),
    },
  };
}

export default async function Page({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  // Fetch the generated image data
  const image = await db
    .selectFrom("generatedImages")
    .select(["id", "imageDataUrl", "userPfpUrl", "promptText", "status", "createdAt"])
    .where("id", "=", id)
    .executeTakeFirst();

  if (!image || image.status !== "completed" || !image.imageDataUrl) {
    notFound();
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <ShareGenerationCard image={image} />
    </div>
  );
}
