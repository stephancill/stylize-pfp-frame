import { NextRequest, NextResponse } from "next/server";
import { withCache } from "@/lib/redis";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = searchParams.get("limit") || "25";

  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

  if (!NEYNAR_API_KEY) {
    return NextResponse.json(
      { error: "Neynar API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Create cache key based on cursor and limit
    const cacheKey = `recents:${cursor || "initial"}:${limit}`;

    const result = await withCache(
      cacheKey,
      async () => {
        const url = new URL("https://api.neynar.com/v2/farcaster/cast/search");
        url.searchParams.append("q", "stylize.steer.fun");
        url.searchParams.append("limit", limit);
        if (cursor) {
          url.searchParams.append("cursor", cursor);
        }

        const response = await fetch(url.toString(), {
          headers: {
            Accept: "application/json",
            api_key: NEYNAR_API_KEY,
          },
        });

        if (!response.ok) {
          throw new Error(`Neynar API error: ${response.status}`);
        }

        const data = await response.json();

        // Filter casts that have stylize.steer.fun embeds and extract generation IDs
        const castsWithGenerationIds = data.result.casts
          .filter((cast: any) => {
            return cast.embeds?.some(
              (embed: any) =>
                embed.url &&
                embed.url.includes("stylize.steer.fun/generations/")
            );
          })
          .map((cast: any) => {
            const stylizeEmbed = cast.embeds.find(
              (embed: any) =>
                embed.url &&
                embed.url.includes("stylize.steer.fun/generations/")
            );

            const generationId = stylizeEmbed?.url?.match(
              /\/generations\/([^/?]+)/
            )?.[1];

            return {
              hash: cast.hash,
              text: cast.text,
              timestamp: cast.timestamp,
              author: {
                username: cast.author.username,
                display_name: cast.author.display_name,
                pfp_url: cast.author.pfp_url,
                fid: cast.author.fid,
              },
              generationId,
              castUrl: `https://farcaster.xyz/~/conversations/${cast.hash}`,
            };
          })
          .filter((cast: any) => cast.generationId); // Only include casts with valid generation IDs

        // Deduplicate by generation ID, keeping the most recent cast for each
        const generationMap = new Map();
        castsWithGenerationIds.forEach((cast: any) => {
          const existing = generationMap.get(cast.generationId);
          if (
            !existing ||
            new Date(cast.timestamp) > new Date(existing.timestamp)
          ) {
            generationMap.set(cast.generationId, cast);
          }
        });

        // Convert back to array, sorted by timestamp (most recent first)
        const deduplicatedCasts = Array.from(generationMap.values()).sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Extract all unique generation IDs to query the database
        const generationIds = deduplicatedCasts.map(
          (cast: any) => cast.generationId
        );

        // Fetch prompt texts from database
        const promptData = await db
          .selectFrom("generatedImages")
          .select(["id", "promptText", "userId"])
          .where("id", "in", generationIds)
          .where("status", "=", "completed")
          .execute();

        // Create a map for quick lookup
        const promptMap = new Map(
          promptData.map((item) => [
            item.id,
            { promptText: item.promptText, userId: item.userId },
          ])
        );

        // Combine cast data with database prompt data
        const filteredCasts = deduplicatedCasts
          .filter((cast: any) => promptMap.has(cast.generationId)) // Only include casts with valid DB entries
          .map((cast: any) => {
            const dbData = promptMap.get(cast.generationId);
            return {
              ...cast,
              promptText: dbData?.promptText || cast.text, // Use DB prompt text, fallback to cast text
              userId: dbData?.userId, // Include the actual user ID from database
            };
          });

        return {
          casts: filteredCasts,
          next: data.result.next || null,
        };
      },
      {
        ttl: 5 * 60, // 5 minutes
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching casts:", error);
    return NextResponse.json(
      { error: "Failed to fetch casts" },
      { status: 500 }
    );
  }
}
