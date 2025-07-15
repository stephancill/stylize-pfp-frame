import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "kysely";
import { withCache } from "@/lib/redis";
import { getUserDatasCached, getFidsFromAddresses } from "@/lib/farcaster";
import { createPublicClient, http, isHex } from "viem";
import { getImageUrl, getInputImageUrl } from "@/lib/image-utils";
import { base, mainnet } from "viem/chains";
import { addEnsContracts } from "@ensdomains/ensjs";
import { batch, getName, getTextRecord } from "@ensdomains/ensjs/public";
import {
  getBasenameDataBatch,
  filterAddressesForBasename,
} from "@/lib/basename";

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const baseClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Create ENS-enabled client
const ensClient = createPublicClient({
  chain: addEnsContracts(mainnet),
  transport: http(),
});

export async function GET(request: NextRequest) {
  try {
    const themes = await withCache(
      "themes:top",
      async () => {
        // First, get the top 10 themes by usage count
        const topThemesQuery = db
          .selectFrom("generatedImages")
          .select(["promptText", db.fn.countAll().as("usageCount")])
          .where("promptText", "is not", null)
          .where("status", "=", "completed")
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
              .groupBy(["gi.id", "gi.userId", "gi.createdAt"])
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

        // Separate user IDs by type
        const ethAddresses: string[] = [];
        const fids: number[] = [];

        Array.from(allUserIds).forEach((userId) => {
          if (isHex(userId)) {
            ethAddresses.push(userId);
          } else {
            const fidNumber = parseInt(userId, 10);
            if (!isNaN(fidNumber)) {
              fids.push(fidNumber);
            }
          }
        });

        // Fetch user data from Farcaster
        const [ethUsers, fidUsers] = await Promise.all([
          ethAddresses.length > 0 ? getFidsFromAddresses(ethAddresses) : [],
          fids.length > 0 ? getUserDatasCached(fids) : [],
        ]);

        // Create lookup maps
        const ethUserMap = new Map();
        ethAddresses.forEach((address, index) => {
          if (ethUsers[index]) {
            ethUserMap.set(address, ethUsers[index]);
          }
        });

        const fidUserMap = new Map();
        fidUsers.forEach((user) => {
          fidUserMap.set(user.fid.toString(), user);
        });

        // Get addresses without Farcaster data for ENS and basename resolution
        const addressesWithoutFarcaster = ethAddresses.filter(
          (address) => !ethUserMap.has(address)
        );

        // Batch fetch ENS names for addresses without Farcaster data
        const ensDataMap = new Map();
        const basenameDataMap = new Map();

        if (addressesWithoutFarcaster.length > 0) {
          // Get ENS data
          try {
            // First, batch get all ENS names
            const nameResults = await batch(
              ensClient,
              ...addressesWithoutFarcaster.map((address) =>
                getName.batch({ address: address as `0x${string}` })
              )
            );

            // Collect addresses with ENS names
            const addressesWithNames: { address: string; name: string }[] = [];
            nameResults.forEach((result, index) => {
              if (result?.name) {
                addressesWithNames.push({
                  address: addressesWithoutFarcaster[index],
                  name: result.name,
                });
              }
            });

            // If we have names, batch get all avatars
            if (addressesWithNames.length > 0) {
              const avatarResults = await batch(
                ensClient,
                ...addressesWithNames.map(({ name }) =>
                  getTextRecord.batch({ name, key: "avatar" })
                )
              );

              // Combine the results
              addressesWithNames.forEach(({ address, name }, index) => {
                ensDataMap.set(address, {
                  name,
                  avatar: avatarResults[index] || null,
                });
              });
            }
          } catch (error) {
            console.error("Error fetching ENS data:", error);
            // Continue without ENS data if there's an error
          }

          // Get basename data for addresses without ENS data
          const addressesWithoutEns = addressesWithoutFarcaster.filter(
            (address) => !ensDataMap.has(address)
          );

          if (addressesWithoutEns.length > 0) {
            try {
              const validAddresses = filterAddressesForBasename(
                addressesWithoutEns as `0x${string}`[]
              );

              if (validAddresses.length > 0) {
                const basenameResults = await getBasenameDataBatch(
                  validAddresses
                );

                basenameResults.forEach(({ address, name, avatar }) => {
                  if (name) {
                    basenameDataMap.set(address, {
                      name,
                      avatar,
                    });
                  }
                });
              }
            } catch (error) {
              console.error("Error fetching basename data:", error);
              // Continue without basename data if there's an error
            }
          }
        }

        // Helper function to get Farcaster user
        const getFarcasterUser = (userId: string) => {
          if (isHex(userId)) {
            return ethUserMap.get(userId) || null;
          } else {
            return fidUserMap.get(userId) || null;
          }
        };

        // Helper function to get standardized user data
        const getStandardizedUserData = (userId: string) => {
          const farcasterUser = getFarcasterUser(userId);
          if (farcasterUser) {
            return {
              username: farcasterUser.username,
              avatar: farcasterUser.pfp_url,
              source: "farcaster" as const,
            };
          }

          // Check for ENS data as fallback for ETH addresses
          if (isHex(userId)) {
            const ensData = ensDataMap.get(userId);
            if (ensData) {
              return {
                username: ensData.name,
                avatar: ensData.avatar,
                source: "ens" as const,
              };
            }

            // Check for basename data as final fallback
            const basenameData = basenameDataMap.get(userId);
            if (basenameData) {
              return {
                username: basenameData.name,
                avatar: basenameData.avatar,
                source: "basename" as const,
              };
            }
          }

          return null;
        };

        // Format the final response
        return themesWithImages.map((theme) => {
          const authorData = theme.authorId
            ? getStandardizedUserData(theme.authorId)
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
              const creatorData = getStandardizedUserData(img.userId);

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
      { ttl: 60 * 60, disableCache: false } // Cache for 1 hour
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
