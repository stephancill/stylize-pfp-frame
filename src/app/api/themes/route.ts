import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "kysely";
import { withCache } from "@/lib/redis";
import { getImageUrl, getInputImageUrl } from "@/lib/image-utils";
import { fetchUserDataForIds, getStandardizedUserData } from "@/lib/user-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const themes = await withCache(
      `themes:top:${userId || "all"}`,
      async () => {
        // Build the base query for themes
        let topThemesQuery = db
          .selectFrom("generatedImages")
          .select(["promptText", db.fn.countAll().as("usageCount")])
          .where("promptText", "is not", null)
          .where("status", "=", "completed");

        // Add filter for specific user if provided
        if (userId) {
          topThemesQuery = topThemesQuery.where("userId", "=", userId);
        }

        // Complete the query
        topThemesQuery = topThemesQuery
          .groupBy("promptText")
          .orderBy(db.fn.countAll(), "desc")
          .limit(10);

        const topThemes = await topThemesQuery.execute();

        // For each theme, get the 3 most referenced images
        const themesWithImages = await Promise.all(
          topThemes.map(async (theme) => {
            // Query to get the 3 most referenced images for this theme
            const topReferencedImagesQuery = db
              .selectFrom("generatedImages as gi")
              .leftJoin(
                "generatedImages as refs",
                "refs.referringImageId",
                "gi.id"
              )
              .select([
                "gi.id",
                "gi.userId",
                "gi.createdAt",
                sql<number>`count(refs.id)`.as("referenceCount"),
              ])
              .where("gi.promptText", "=", theme.promptText)
              .where("gi.status", "=", "completed")
              .where("refs.status", "=", "completed") // Only count completed references
              .groupBy(["gi.id", "gi.userId", "gi.createdAt"])
              .having(sql`count(refs.id)`, ">", 0) // Only include images with references
              .orderBy(sql`count(refs.id)`, "desc")
              .orderBy("gi.createdAt", "asc") // Secondary sort by creation date for consistency
              .limit(3);

            const topImages = await topReferencedImagesQuery.execute();

            // Get the original author (first occurrence)
            const originalAuthorQuery = db
              .selectFrom("generatedImages")
              .select(["userId", "id"])
              .where("promptText", "=", theme.promptText)
              .where("status", "=", "completed")
              .orderBy("createdAt", "asc")
              .limit(1);

            const originalAuthor = await originalAuthorQuery.executeTakeFirst();

            return {
              promptText: theme.promptText,
              usageCount: Number(theme.usageCount),
              authorId: originalAuthor?.userId || null,
              images: topImages.map((img) => ({
                id: img.id,
                userId: img.userId,
                referenceCount: Number(img.referenceCount),
              })),
            };
          })
        );

        // Collect all unique user IDs for batch fetching
        const allUserIds = new Set<string>();
        themesWithImages.forEach((theme) => {
          if (theme.authorId) allUserIds.add(theme.authorId);
          theme.images.forEach((img) => {
            if (img.userId) allUserIds.add(img.userId);
          });
        });

        // Fetch user data using the utility
        const userDataMaps = await fetchUserDataForIds(Array.from(allUserIds));

        // Format the final response
        return themesWithImages.map((theme) => {
          const authorData = theme.authorId
            ? getStandardizedUserData(theme.authorId, userDataMaps)
            : null;

          return {
            promptText: theme.promptText,
            usageCount: theme.usageCount,
            author: theme.authorId
              ? {
                  id: theme.authorId,
                  ...authorData,
                }
              : null,
            images: theme.images.map((img) => {
              const creatorData = getStandardizedUserData(
                img.userId,
                userDataMaps
              );

              return {
                id: img.id,
                referenceCount: img.referenceCount,
                creator: {
                  id: img.userId,
                  ...creatorData,
                },
                urls: {
                  input: getInputImageUrl(img.id),
                  output: getImageUrl(img.id),
                },
              };
            }),
          };
        });
      },
      { ttl: 60 * 60 } // Cache for 1 hour
    );

    return NextResponse.json({
      themes,
    });
  } catch (error) {
    console.error("Error fetching themes:", error);
    return NextResponse.json(
      { error: "Failed to fetch themes" },
      { status: 500 }
    );
  }
}
