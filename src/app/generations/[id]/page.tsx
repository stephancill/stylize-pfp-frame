import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { Shuffle } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getImageUrl, getInputImageUrl } from "@/lib/image-utils";
import { SwitchableImage } from "@/components/SwitchableImage";
import { PromptDisplay } from "@/components/PromptDisplay";

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
    .select(["status", "createdAt", "quoteId", "promptText"])
    .where("id", "=", id)
    .executeTakeFirst();

  if (!image) {
    return notFound();
  }

  const imageData = {
    createdAt: image.createdAt.toISOString(),
    id,
    imageDataUrl: getImageUrl(id),
    promptText: image.promptText,
    quoteId: image.quoteId,
    userPfpUrl: getInputImageUrl(id),
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-4">
        <div className="aspect-square relative">
          <SwitchableImage image={imageData} toggleEnabled={true} />
        </div>

        <PromptDisplay promptText={imageData.promptText || ""} />

        <div className="flex justify-center">
          <Link href={`/?promptId=${id}`} className="w-full">
            <Button variant="default" size="lg" className="w-full">
              <Shuffle className="h-4 w-4" />
              Use this theme
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
