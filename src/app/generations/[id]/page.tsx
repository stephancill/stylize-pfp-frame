import { FRAME_METADATA } from "@/lib/constants";
import { Metadata } from "next";
import { GenerationPageClient } from "./GenerationPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "Stylize Me - Shared Creation",
    description: "Check out this AI-generated character created with Stylize Me",
    other: {
      "fc:frame": JSON.stringify({
        ...FRAME_METADATA,
        imageUrl: `${process.env.APP_URL}/generations/${id}/opengraph-image`,
      }),
    },
  };
}

export default async function GenerationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GenerationPageClient id={id} />;
}
