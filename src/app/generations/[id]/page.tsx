import { FRAME_METADATA } from "@/lib/constants";
import { Metadata } from "next";
import { redirect } from "next/navigation";

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

export default function Page() {
  redirect("/");
}
