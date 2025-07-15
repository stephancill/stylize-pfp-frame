import { CreationItem } from "@/components/CreationItem";
import { MiniAppReady } from "@/components/MiniAppReady";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { Sparkles } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getImageUrl, getInputImageUrl } from "@/lib/image-utils";

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
        version: "next",
        imageUrl: `${process.env.APP_URL}/generations/${id}/opengraph-image`,
        iconUrl: `${process.env.APP_URL}/splash.png`,
        button: {
          title: "Stylize Me",
          action: {
            type: "launch_frame",
            name: "Stylize Me",
            url: `${process.env.APP_URL}/generations/${id}`,
            splashImageUrl: `${process.env.APP_URL}/splash.png`,
            splashBackgroundColor: "#ffffff",
          },
        },
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
      "status",
      "createdAt",
      "quoteId",
      "promptText",
    ])
    .where("id", "=", id)
    .executeTakeFirst();

  if (!image) {
    return notFound();
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <MiniAppReady />
      <div className="max-w-md w-full space-y-4">
        <CreationItem
          image={{
            createdAt: image.createdAt.toISOString(),
            id,
            imageDataUrl: getImageUrl(id),
            promptText: image.promptText,
            quoteId: image.quoteId,
            userPfpUrl: getInputImageUrl(id),
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
