import { db } from "@/lib/db";
import { sql } from "kysely";
import { withCache } from "@/lib/redis";
import { getBaseUrl, getImageUrl, getInputImageUrl } from "@/lib/image-utils";
import { fetchUserDataForIds, getStandardizedUserData } from "@/lib/user-data";

export interface Theme {
  id: string;
  name: string;
  prompt: string;
}

export interface ServerTheme {
  promptText: string;
  usageCount: number;
  author: {
    id: string;
    username?: string;
    avatar?: string | null;
    source?: "farcaster" | "ens" | "basename";
  } | null;
  images: Array<{
    id: string;
    referenceCount: number;
    creator: {
      id: string;
      username?: string;
      avatar?: string | null;
      source?: "farcaster" | "ens" | "basename";
    };
    urls: {
      input: string | null;
      output: string | null;
    };
  }>;
}

export async function getThemeById(id: string): Promise<ServerTheme | null> {
  const domain = new URL(getBaseUrl()).hostname;

  return await withCache(
    `${domain}:theme:${id}`,
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

      // Get the total usage count for this prompt
      const totalUsageQuery = db
        .selectFrom("generatedImages")
        .select([db.fn.countAll().as("totalUsage")])
        .where("promptText", "=", image.promptText)
        .where("status", "=", "completed");

      const totalUsage = await totalUsageQuery.executeTakeFirst();

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

      // Helper function to format user data
      const formatUserData = (userId: string | null) => {
        if (!userId)
          return {
            id: "",
            username: undefined,
            avatar: null,
            source: "farcaster" as const,
          };

        const userData = getStandardizedUserData(userId, userDataMaps);
        return {
          id: userId,
          username: userData?.username,
          avatar: userData?.avatar || null,
          source: "farcaster" as const, // Default to farcaster
        };
      };

      // Format the response in ServerTheme format
      return {
        promptText: image.promptText,
        usageCount: Number(totalUsage?.totalUsage || 1),
        author: originalAuthor?.userId
          ? formatUserData(originalAuthor.userId)
          : null,
        images: [
          // Original image (always first, with referenceCount: 0)
          {
            id: image.id,
            referenceCount: 0,
            creator: formatUserData(image.userId),
            urls: {
              input: getInputImageUrl(image.id),
              output: getImageUrl(image.id),
            },
          },
          // Top referenced images
          ...topImages.map((img) => ({
            id: img.id,
            referenceCount: Number(img.referenceCount),
            creator: formatUserData(img.userId),
            urls: {
              input: getInputImageUrl(img.id),
              output: getImageUrl(img.id),
            },
          })),
        ],
      };
    },
    { ttl: 15 * 60, disableCache: false } // Cache for 15 minutes
  );
}

export const themes: Theme[] = [
  {
    id: "studioGhibli",
    name: "Studio Ghibli",
    prompt: `Reimagine the provided image in the iconic Studio Ghibli style.`,
  },
  {
    id: "higherBuddy",
    name: "Higher Buddy",
    prompt: `come up with an animal or creature (not too obscure) that is representative of the character or vibe of the image.

then generate a profile picture of the animal. include as many defining characteristics as possible. if the character is wearing clothes, try to match it as closely as possible - otherwise give the character a minimalist outfit.

image characteristics: high grain effect, 90s disposable camera style with chromatic aberration, slight yellow tint, and hyper-realistic photography with detailed elements, captured in harsh flash photography style, vintage paparazzi feel. preserve the prominent colors in the original image`,
  },
  {
    id: "cinematicFantasy",
    name: "Cinematic Fantasy",
    prompt: `Transform the provided profile picture into a mythical or fantasy version.

Key elements for the transformation:
1. Subject Adaptation: Reimagine the animal/creature in the image as a mythical or fantasy version.
2. Attire/Features: Adorn the subject with fantasy-themed attire or features (e.g., mystical armor, glowing runes, ethereal wings) suitable for its form.
3. Atmosphere: Create a dramatic and cinematic atmosphere with dynamic lighting (e.g., god rays, magical glows, contrasting shadows) and a rich, detailed background suggesting an epic fantasy world.
4. Artistic Style: The final image should look like a piece of high-detail digital fantasy art, emphasizing realism within the fantasy context.

Ensure the result is a captivating, profile picture-worthy artwork.`,
  },
];

export { themes as default };
