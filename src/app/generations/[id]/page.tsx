import { ThemeContent } from "@/components/ThemeContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getThemeById } from "@/lib/themes";
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

  // Fetch theme data directly using the extracted function
  const themeData = await getThemeById(id);

  if (!themeData) {
    notFound();
  }

  const selectedTheme = {
    id: `theme-${id}`,
    name: themeData.author?.username || "Community",
    prompt: themeData.promptText,
    usageCount: themeData.usageCount,
    author: themeData.author,
    selectedImage: themeData.images[0], // First image is the original
    images: themeData.images,
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="max-w-md w-full">
        <Card>
          <CardContent className="p-6">
            <ThemeContent
              selectedTheme={selectedTheme}
              showForkButton={false}
              className="mb-6"
            />

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
