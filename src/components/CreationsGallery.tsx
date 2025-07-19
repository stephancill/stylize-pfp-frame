import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaContent,
  CredenzaTitle,
} from "@/components/ui/credenza";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/providers/AuthProvider";
import { useInfiniteImages } from "@/hooks/useInfiniteImages";
import { getImageUrl } from "@/lib/image-utils";
import sdk from "@farcaster/frame-sdk";
import {
  Copy,
  Download,
  FileText,
  Image,
  MessageCircle,
  Plus,
  RefreshCw,
  Share2,
  Twitter,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CompletedImage, SimpleCreationItem } from "./SimpleCreationItem";
import type { CompletedImage as CreationItemCompletedImage } from "./CreationItem";

// Skeleton component for creation items
function CreationItemSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Skeleton className="aspect-square w-full" />
    </div>
  );
}

interface CreationsGalleryProps {
  selectedImageFromUrl?: CreationItemCompletedImage | null;
  isLoadingImageFromUrl?: boolean;
  onImageModalClose?: () => void;
}

export function CreationsGallery({
  selectedImageFromUrl,
  isLoadingImageFromUrl = false,
  onImageModalClose,
}: CreationsGalleryProps = {}) {
  const { userId } = useAuth();
  const isMobile = useIsMobile();
  const [selectedImage, setSelectedImage] = useState<CompletedImage | null>(
    null
  );
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [reusePopoverOpen, setReusePopoverOpen] = useState(false);
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteImages(userId);

  // Flatten all pages into a single array of images
  const allImages = useMemo(
    () => data?.pages.flatMap((page) => page.images) ?? [],
    [data]
  );

  // Intersection observer for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastImageRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading || isFetchingNextPage) return;

      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  // Check if we're in a Farcaster mini app context
  useEffect(() => {
    sdk.context
      .then((context) => {
        if (context) {
          setIsInMiniApp(true);
        } else {
          setIsInMiniApp(false);
        }
      })
      .catch(() => setIsInMiniApp(false));
  }, []);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Handle selectedImageFromUrl prop
  useEffect(() => {
    if (selectedImageFromUrl) {
      // Convert CreationItemCompletedImage to CompletedImage format
      const convertedImage: CompletedImage = {
        id: selectedImageFromUrl.id,
        imageDataUrl: selectedImageFromUrl.imageDataUrl,
        promptText: selectedImageFromUrl.promptText,
        createdAt: selectedImageFromUrl.createdAt,
        quoteId: selectedImageFromUrl.quoteId,
        userPfpUrl: selectedImageFromUrl.userPfpUrl,
      };
      setSelectedImage(convertedImage);
    }
  }, [selectedImageFromUrl]);

  const shareUrl = useMemo(
    () =>
      selectedImage && typeof window !== "undefined"
        ? `${window.location.origin}/generations/${selectedImage.id}`
        : undefined,
    [selectedImage]
  );

  const handleDownloadImage = (imageDataUrl: string, imageId: string) => {
    try {
      const link = document.createElement("a");
      link.href = imageDataUrl;
      link.download = `stylized-character-${imageId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  };

  const handleCopyUrl = async () => {
    if (!shareUrl) {
      toast.error("Failed to copy link");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
      setPopoverOpen(false);
    } catch (err) {
      console.error("Failed to copy URL:", err);
      toast.error("Failed to copy link");
    }
  };

  const handleDraftTweet = () => {
    window.open(
      `https://x.com/intent/tweet?text=Check%20out%20my%20new%20character!%20${shareUrl}`,
      "_blank"
    );
    setPopoverOpen(false);
  };

  const handleDraftCast = async () => {
    if (!shareUrl) {
      toast.error("Failed to draft cast");
      return;
    }

    try {
      sdk.actions.composeCast({
        text: `Check out this image I generated! ${shareUrl}`,
        embeds: [shareUrl, getImageUrl(selectedImage!.id)],
      });
      setPopoverOpen(false);
    } catch (err) {
      console.error("Failed to draft cast:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array(6)
          .fill(null)
          .map((_, i) => (
            <CreationItemSkeleton key={i} />
          ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center text-red-500 py-4">
        Error loading images:{" "}
        {error instanceof Error ? error.message : String(error)}
      </p>
    );
  }

  if (allImages.length === 0) {
    return (
      <p className="text-center text-gray-500 py-4">
        You haven't generated any images yet.
      </p>
    );
  }

  const handleModalClose = (open: boolean) => {
    if (!open) {
      setSelectedImage(null);
      onImageModalClose?.();
    }
  };

  return (
    <Credenza
      open={!!selectedImage || isLoadingImageFromUrl}
      onOpenChange={handleModalClose}
    >
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {allImages.map((image, index) => {
          const isLastImage = index === allImages.length - 1;

          return (
            <div
              key={image.id || image.quoteId}
              ref={isLastImage ? lastImageRef : undefined}
            >
              <SimpleCreationItem
                image={image}
                onClick={() => setSelectedImage(image)}
              />
            </div>
          );
        })}

        {isFetchingNextPage && (
          <div className="col-span-full flex justify-center items-center py-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
              {Array(3)
                .fill(null)
                .map((_, i) => (
                  <CreationItemSkeleton key={i} />
                ))}
            </div>
          </div>
        )}
      </div>

      {(selectedImage || isLoadingImageFromUrl) && (
        <CredenzaContent className="max-w-md">
          <CredenzaTitle className="sr-only">Image</CredenzaTitle>
          <div className="space-y-4 p-4">
            {/* Loading state with skeletons */}
            {isLoadingImageFromUrl ? (
              <div className="space-y-4">
                {/* Image skeleton */}
                <div className="aspect-square relative">
                  <Skeleton className="w-full h-full rounded-md" />
                </div>

                {/* Prompt skeleton */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>

                {/* Action buttons skeleton */}
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                </div>
              </div>
            ) : (
              <>
                <div className="aspect-square relative">
                  <SimpleCreationItem
                    image={selectedImage}
                    onClick={() => {}}
                    toggleEnabled={true}
                  />
                </div>

                {/* Prompt display */}
                {selectedImage.promptText && (
                  <div>
                    <p
                      className={`text-sm text-muted-foreground whitespace-pre-wrap cursor-pointer ${
                        !showFullPrompt ? "line-clamp-2" : ""
                      }`}
                      onClick={() => {
                        if (
                          selectedImage.promptText &&
                          selectedImage.promptText.length > 100
                        ) {
                          setShowFullPrompt(!showFullPrompt);
                        }
                      }}
                    >
                      {selectedImage.promptText}
                    </p>
                    {selectedImage.promptText &&
                      selectedImage.promptText.length > 100 && (
                        <button
                          type="button"
                          onClick={() => setShowFullPrompt(!showFullPrompt)}
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          {showFullPrompt ? "Show less" : "Show more"}
                        </button>
                      )}
                  </div>
                )}

                <div className="flex gap-2">
                  {selectedImage.imageDataUrl && !isInMiniApp && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        handleDownloadImage(
                          selectedImage.imageDataUrl!,
                          selectedImage.id
                        )
                      }
                    >
                      <Download className={`h-4 w-4 ${!isMobile ? "mr-2" : ""}`} />
                      {!isMobile && "Download"}
                    </Button>
                  )}
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen} modal>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <Share2 className={`h-4 w-4 ${!isMobile ? "mr-2" : ""}`} />
                        {!isMobile && "Share"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-56 p-2 z-[100]"
                      align="end"
                      side="top"
                      sideOffset={5}
                    >
                      <div className="space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start hover:bg-accent hover:text-accent-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyUrl();
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy link
                        </Button>
                        {!isInMiniApp && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start hover:bg-accent hover:text-accent-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDraftTweet();
                            }}
                          >
                            <Twitter className="h-4 w-4 mr-2" />
                            Draft Tweet
                          </Button>
                        )}
                        {isInMiniApp && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start hover:bg-accent hover:text-accent-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDraftCast();
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Draft Cast
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover
                    open={reusePopoverOpen}
                    onOpenChange={setReusePopoverOpen}
                    modal
                  >
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <RefreshCw
                          className={`h-4 w-4 ${!isMobile ? "mr-2" : ""}`}
                        />
                        {!isMobile && "Remix"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-56 p-2 z-[100]"
                      align="end"
                      side="top"
                      sideOffset={5}
                    >
                      <div className="space-y-1">
                        <Link
                          href={`/?promptId=${selectedImage.id}`}
                          className="w-full"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start hover:bg-accent hover:text-accent-foreground"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Use prompt
                          </Button>
                        </Link>
                        <Link
                          href={`/?imageUrl=${encodeURIComponent(
                            getImageUrl(selectedImage.id)
                          )}`}
                          className="w-full"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start hover:bg-accent hover:text-accent-foreground"
                          >
                            <Image className="h-4 w-4 mr-2" />
                            Use image
                          </Button>
                        </Link>
                        <Link
                          href={`/?promptId=${
                            selectedImage.id
                          }&imageUrl=${encodeURIComponent(
                            getImageUrl(selectedImage.id)
                          )}`}
                          className="w-full"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start hover:bg-accent hover:text-accent-foreground"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Use both
                          </Button>
                        </Link>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>
        </CredenzaContent>
      )}
    </Credenza>
  );
}
