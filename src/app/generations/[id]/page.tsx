import { FRAME_METADATA } from "@/lib/constants";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

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
  params: { id: string };
}) {
  try {
    const image = await db
      .selectFrom("generatedImages")
      .select(["promptText"])
      .where("id", "=", params.id)
      .executeTakeFirst();

    if (image?.promptText) {
      const encoded = encodeURIComponent(image.promptText);
      redirect(`/?prompt=${encoded}`);
      return;
    }
  } catch (e) {
    console.error("Error fetching prompt", e);
  }
  redirect("/");
}
