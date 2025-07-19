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
import { getImageUrl } from "@/lib/image-utils";
import sdk from "@farcaster/frame-sdk";
import {
  Copy,
  Download,
  MessageCircle,
  Share2,
  Sparkles,
  Twitter,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CompletedImage, SimpleCreationItem } from "./SimpleCreationItem";
import { useRouter } from "next/navigation";

interface ImageDetailModalProps {
  image: CompletedImage | null;
  isLoading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageDetailModal({
  image,
  isLoading = false,
  open,
  onOpenChange,
}: ImageDetailModalProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [showFullPrompt, setShowFullPrompt] = useState(false);

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

  const shareUrl = useMemo(
    () =>
      image && typeof window !== "undefined"
        ? `${window.location.origin}/generations/${image.id}`
        : undefined,
    [image]
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
    if (!shareUrl || !image) {
      toast.error("Failed to draft cast");
      return;
    }

    try {
      sdk.actions.composeCast({
        text: `Check out this image I generated! ${shareUrl}`,
        embeds: [shareUrl, getImageUrl(image.id)],
      });
      setPopoverOpen(false);
    } catch (err) {
      console.error("Failed to draft cast:", err);
    }
  };

  const handleRemix = () => {
    if (!image) return;
    
    // Close the modal
    onOpenChange(false);
    
    // Navigate to the main page with the promptId parameter
    router.push(`/?promptId=${image.id}`);
  };

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className="max-w-md">
        <CredenzaTitle className="sr-only">Image</CredenzaTitle>
        <div className="space-y-4 p-4">
          {/* Loading state with skeletons */}
          {isLoading ? (
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
            image && (
              <>
                <div className="aspect-square relative">
                  <SimpleCreationItem
                    image={image}
                    onClick={() => {}}
                    toggleEnabled={true}
                  />
                </div>

                {/* Prompt display */}
                {image.promptText && (
                  <div>
                    <p
                      className={`text-sm text-muted-foreground whitespace-pre-wrap cursor-pointer ${
                        !showFullPrompt ? "line-clamp-2" : ""
                      }`}
                      onClick={() => {
                        if (
                          image.promptText &&
                          image.promptText.length > 100
                        ) {
                          setShowFullPrompt(!showFullPrompt);
                        }
                      }}
                    >
                      {image.promptText}
                    </p>
                    {image.promptText && image.promptText.length > 100 && (
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
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={handleRemix}
                  >
                    <Sparkles className={`h-4 w-4 ${!isMobile ? "mr-2" : ""}`} />
                    {!isMobile && "Remix"}
                  </Button>
                  {image.imageDataUrl && !isInMiniApp && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        handleDownloadImage(image.imageDataUrl!, image.id)
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
                </div>
              </>
            )
          )}
        </div>
      </CredenzaContent>
    </Credenza>
  );
}