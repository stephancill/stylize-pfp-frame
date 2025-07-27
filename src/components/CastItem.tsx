"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  SwitchableImage,
  type CompletedImage,
} from "@/components/SwitchableImage";
import { PromptDisplay } from "@/components/PromptDisplay";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { timeAgo } from "@/lib/utils";
import type { Cast } from "@/types/user";
import sdk from "@farcaster/miniapp-sdk";
import { Shuffle } from "lucide-react";
import { useMemo } from "react";
import { useMiniAppContext } from "@/providers/MiniAppContextProvider";
import Link from "next/link";

interface CastItemProps {
  cast: Cast;
}

export function CastItemSkeleton() {
  const isMobile = useIsMobile();

  return (
    <Card>
      <CardContent className="p-4">
        {/* Images */}
        {isMobile ? (
          <div className="mb-4">
            <Skeleton className="aspect-square rounded-lg" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="aspect-square rounded-lg" />
          </div>
        )}

        {/* Prompt text */}
        <div className="mb-4">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex-col gap-4">
        {/* User info */}
        <div className="flex items-center gap-3 w-full">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            {!isMobile && <Skeleton className="h-8 w-32" />}
          </div>
        </div>

        {/* Use this theme button - mobile only */}
        {isMobile && (
          <div className="flex justify-center w-full">
            <Skeleton className="h-10 w-full" />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default function CastItem({ cast }: CastItemProps) {
  const { context } = useMiniAppContext();
  const isMobile = useIsMobile();

  const inputImageUrl = `https://stylize.steer.fun/api/images/${cast.generationId}/input`;
  const outputImageUrl = `https://stylize.steer.fun/api/images/${cast.generationId}`;

  // Use promptText from database if available, otherwise fall back to cast text
  const displayPrompt = cast.promptText || cast.text;

  // Convert Cast to CompletedImage format for SwitchableImage
  const switchableImageData: CompletedImage = useMemo(
    () => ({
      id: cast.generationId,
      imageDataUrl: outputImageUrl, // Output image as primary
      promptText: displayPrompt,
      createdAt: cast.timestamp,
      quoteId: cast.hash,
      userPfpUrl: inputImageUrl, // Input image as secondary
      referenceCount: 0,
    }),
    [cast, inputImageUrl, outputImageUrl, displayPrompt]
  );

  const handleViewCast = async () => {
    if (context) {
      await sdk.actions.viewCast({ hash: cast.hash });
    } else {
      const fallbackUrl =
        cast.castUrl ||
        `https://warpcast.com/${cast.author.username}/${cast.hash.slice(
          0,
          10
        )}`;
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        {/* Images */}
        {isMobile ? (
          <div className="mb-4">
            <SwitchableImage image={switchableImageData} toggleEnabled={true} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
              <img
                src={inputImageUrl}
                alt="Input image"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            </div>

            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
              <img
                src={outputImageUrl}
                alt="Output image"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            </div>
          </div>
        )}

        {/* Prompt text */}
        {displayPrompt && (
          <div className="mb-4">
            <PromptDisplay promptText={displayPrompt} />
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex-col gap-4">
        {/* User info */}
        <div className="flex items-center gap-3 w-full">
          <Avatar className="w-10 h-10">
            <AvatarImage
              src={cast.author.pfp_url}
              alt={cast.author.display_name}
            />
            <AvatarFallback>
              {cast.author.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {cast.author.display_name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              @{cast.author.username} · {timeAgo(cast.timestamp)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={"ghost"}
              onClick={handleViewCast}
              className="flex items-center gap-2"
            >
              View Cast
            </Button>
            {!isMobile && (
              <Link href={`/?promptId=${cast.generationId}`}>
                <Button size="sm" className="flex items-center gap-2">
                  <Shuffle className="w-4 h-4" />
                  Use this theme
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Use this theme button - mobile only */}
        {isMobile && (
          <div className="flex justify-center w-full">
            <Link href={`/?promptId=${cast.generationId}`} className="w-full">
              <Button className="flex items-center justify-center gap-2 w-full">
                <Shuffle className="w-4 h-4" />
                Use this theme
              </Button>
            </Link>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
