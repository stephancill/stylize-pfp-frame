import { CreationItem } from "@/components/CreationItem";
import { Button } from "@/components/ui/button";
import { FRAME_METADATA } from "@/lib/constants";
import { db } from "@/lib/db";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

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
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Fetch image from database
  const image = await db
    .selectFrom("generatedImages")
    .select([
      "imageDataUrl",
      "status",
      "createdAt",
      "quoteId",
      "userPfpUrl",
      "promptText",
    ])
    .where("id", "=", id)
    .executeTakeFirst();

  if (!image) {
    return notFound();
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-4">
        <CreationItem
          image={{
            createdAt: image.createdAt.toISOString(),
            id,
            imageDataUrl: image.imageDataUrl,
            promptText: image.promptText,
            quoteId: image.quoteId,
            userPfpUrl: image.userPfpUrl,
          }}
        />
        <div className="flex justify-center">
          <Link href={`/?generationId=${id}`} className="w-full">
            <Button variant="outline" size="sm" className="w-full text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Use this theme
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
