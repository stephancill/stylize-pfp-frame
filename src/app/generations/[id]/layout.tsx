import { FRAME_METADATA } from "@/lib/constants";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "Stylize Me - Shared Creation",
    description: "Check out this AI-generated character!",
    other: {
      "fc:frame": JSON.stringify({
        ...FRAME_METADATA,
        imageUrl: `${process.env.APP_URL}/generations/${id}/opengraph-image`,
      }),
    },
  };
}

export default function GenerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}