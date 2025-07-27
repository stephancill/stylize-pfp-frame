import { ThemeContent } from "@/components/ThemeContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getBaseUrl } from "@/lib/image-utils";
import { Shuffle } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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

  let image:
    | {
        status: string;
        createdAt: Date;
        quoteId: string;
        promptText: string | null;
      }
    | undefined;
  try {
    image = await db
      .selectFrom("generatedImages")
      .select(["status", "createdAt", "quoteId", "promptText"])
      .where("id", "=", id)
      .executeTakeFirst();
  } catch (error) {
    console.error("Failed to fetch image:", error);
  }

  if (!image) {
    return notFound();
  }

  // Fetch theme data from our API
  let themeData = null;
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/themes/${id}`);

    if (response.ok) {
      const data = await response.json();
      themeData = data.theme;
    }
  } catch (error) {
    console.error("Failed to fetch theme data:", error);
  }

  const selectedTheme = themeData
    ? {
        id: `theme-${id}`,
        name: themeData.author?.username || "Community",
        prompt: themeData.promptText,
        usageCount: themeData.usageCount,
        author: themeData.author,
        selectedImage: themeData.originalImage,
        images: [
          themeData.originalImage,
          ...(themeData.topReferencedImages || []),
        ],
      }
    : null;

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="max-w-md w-full">
        <Card>
          <CardContent className="p-6">
            {selectedTheme && (
              <ThemeContent
                selectedTheme={selectedTheme}
                showForkButton={false}
                className="mb-6"
              />
            )}

            <div className="flex justify-center">
              <Link href={`/?promptId=${id}`} className="w-full">
                <Button variant="default" size="lg" className="w-full">
                  <Shuffle className="h-4 w-4" />
                  Use this theme
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
