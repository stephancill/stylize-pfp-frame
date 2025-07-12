"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import sdk from "@farcaster/frame-sdk";
import { Download, Share2, Copy, Twitter, MessageCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

export interface CompletedImage {
  id: string;
  imageDataUrl: string | null;
  promptText: string | null;
  createdAt: string;
  quoteId: string;
  userPfpUrl: string | null;
}

export function CreationItem({ image }: { image: CompletedImage }) {
  const [showInputFirst, setShowInputFirst] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [isClient, setIsClient] = useState(false);

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

  // Check if we're in a Farcaster mini app context
  useEffect(() => {
    sdk
      .isInMiniApp()
      .then(setIsInMiniApp)
      .catch(() => setIsInMiniApp(false));
  }, []);

  // Set client flag to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const mainImageSrc = showInputFirst
    ? image.userPfpUrl || image.imageDataUrl || ""
    : image.imageDataUrl || image.userPfpUrl || "";
  const overlaySrc = showInputFirst
    ? image.imageDataUrl || ""
    : image.userPfpUrl || "";

  const shareUrl = useMemo(
    () =>
      typeof window !== "undefined"
        ? `${window.location.origin}/generations/${image.id}`
        : undefined,
    [image.id]
  );

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
        text: `Check out my new character! ${shareUrl}`,
        embeds: [shareUrl],
      });
      setPopoverOpen(false);
    } catch (err) {
      console.error("Failed to draft cast:", err);
    }
  };

  return (
    <Card key={image.id || image.quoteId} className="flex flex-col">
      <CardContent className="p-0 aspect-square flex-grow relative group overflow-hidden">
        {mainImageSrc ? (
          <>
            <img
              src={mainImageSrc}
              alt={image.promptText || "Generated Character"}
              className="w-full h-full object-cover"
            />
            {overlaySrc && (
              <img
                src={overlaySrc}
                alt="Input"
                className="absolute top-2 right-2 w-16 h-16 object-cover border-2 border-background rounded-md cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowInputFirst((prev) => !prev);
                }}
              />
            )}
            <div className="absolute bottom-2 left-2 right-2 flex justify-between gap-2 pointer-events-auto">
              {image.imageDataUrl && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDownloadImage(image.imageDataUrl!, image.id);
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-8 w-8">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-56 p-2 z-50"
                  align="end"
                  side="top"
                >
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleCopyUrl}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleDraftTweet}
                    >
                      <Twitter className="h-4 w-4 mr-2" />
                      Draft Tweet
                    </Button>
                    {isInMiniApp && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={handleDraftCast}
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
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <p className="text-muted-foreground">Image not available</p>
          </div>
        )}
      </CardContent>
      {(image.promptText || image.createdAt || image.imageDataUrl) && (
        <CardFooter className="p-3 flex flex-col items-start border-t">
          {image.createdAt && isClient && (
            <p className="text-xs text-muted-foreground/80 mt-1">
              {new Date(image.createdAt).toLocaleDateString()}
            </p>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
