import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "kysely";
import { withCache } from "@/lib/redis";
import { getImageUrl, getInputImageUrl } from "@/lib/image-utils";
import { fetchUserDataForIds, getStandardizedUserData } from "@/lib/user-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const theme = await withCache(
      `theme:${id}`,
      async () => {
        // Get the specific image and its prompt
        const imageQuery = db
          .selectFrom("generatedImages")
          .select(["id", "userId", "promptText", "createdAt", "status"])
          .where("id", "=", id)
          .where("status", "=", "completed");

        const image = await imageQuery.executeTakeFirst();

        if (!image || !image.promptText) {
          return null;
        }

        // Get the 2 most referenced images using the same prompt (excluding the current image)
        const topReferencedImagesQuery = db
          .selectFrom("generatedImages as gi")
          .leftJoin("generatedImages as refs", "refs.referringImageId", "gi.id")
          .select([
            "gi.id",
            "gi.userId",
            "gi.createdAt",
            sql<number>`count(refs.id)`.as("referenceCount"),
          ])
          .where("gi.promptText", "=", image.promptText)
          .where("gi.status", "=", "completed")
          .where("refs.status", "=", "completed") // Only count completed references
          .where("gi.id", "!=", id) // Exclude the current image
          .groupBy(["gi.id", "gi.userId", "gi.createdAt"])
          .having(sql`count(refs.id)`, ">", 0) // Only include images with references
          .orderBy(sql`count(refs.id)`, "desc")
          .orderBy("gi.createdAt", "asc") // Secondary sort by creation date for consistency
          .limit(2);

        const topImages = await topReferencedImagesQuery.execute();

        // Get the original author (first occurrence of this prompt)
        const originalAuthorQuery = db
          .selectFrom("generatedImages")
          .select(["userId", "id"])
          .where("promptText", "=", image.promptText)
          .where("status", "=", "completed")
          .orderBy("createdAt", "asc")
          .limit(1);

        const originalAuthor = await originalAuthorQuery.executeTakeFirst();

        // Collect all unique user IDs for batch fetching
        const allUserIds = new Set<string>();

        // Add the current image's user
        if (image.userId) allUserIds.add(image.userId);

        // Add the original author
        if (originalAuthor?.userId) allUserIds.add(originalAuthor.userId);

        // Add the top referenced images' users
        topImages.forEach((img) => {
          if (img.userId) allUserIds.add(img.userId);
        });

        // Fetch user data using the utility
        const userDataMaps = await fetchUserDataForIds(Array.from(allUserIds));

        // Format the response
        return {
          promptText: image.promptText,
          originalImage: {
            id: image.id,
            creator: {
              id: image.userId,
              ...getStandardizedUserData(image.userId, userDataMaps),
            },
            urls: {
              input: getInputImageUrl(image.id),
              output: getImageUrl(image.id),
            },
            createdAt: image.createdAt,
          },
          author: originalAuthor?.userId
            ? {
                id: originalAuthor.userId,
                ...getStandardizedUserData(originalAuthor.userId, userDataMaps),
              }
            : null,
          topReferencedImages: topImages.map((img) => {
            const creatorData = getStandardizedUserData(
              img.userId,
              userDataMaps
            );

            return {
              id: img.id,
              referenceCount: Number(img.referenceCount),
              creator: {
                id: img.userId,
                ...creatorData,
              },
              urls: {
                input: getInputImageUrl(img.id),
                output: getImageUrl(img.id),
              },
              createdAt: img.createdAt,
            };
          }),
        };
      },
      { ttl: 15 * 60, disableCache: false } // Cache for 15 minutes
    );

    if (!theme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    return NextResponse.json({
      theme,
    });
  } catch (error) {
    console.error("Error fetching theme:", error);
    return NextResponse.json(
      { error: "Failed to fetch theme" },
      { status: 500 }
    );
  }
}
