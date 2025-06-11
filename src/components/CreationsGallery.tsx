import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Download } from "lucide-react";
import sdk from "@farcaster/frame-sdk";

interface CompletedImage {
  id: string;
  imageDataUrl: string | null;
  promptText: string | null;
  createdAt: string;
  quoteId: string;
}

interface CreationsGalleryProps {
  images: CompletedImage[];
  isLoading: boolean;
  error: Error | null;
  onDownload: (imageDataUrl: string, imageId: string) => void;
}

export function CreationsGallery({
  images,
  isLoading,
  error,
  onDownload,
}: CreationsGalleryProps) {
  if (isLoading) {
    return <p className="text-center py-4">Loading your images...</p>;
  }

  if (error) {
    return (
      <p className="text-center text-red-500 py-4">
        Error loading images:{" "}
        {error instanceof Error ? error.message : String(error)}
      </p>
    );
  }

  if (images.length === 0) {
    return (
      <p className="text-center text-gray-500 py-4">
        You haven't generated any characters yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {images.map((image) => (
        <Card
          key={image.id || image.quoteId}
          className="overflow-hidden flex flex-col"
        >
          <CardContent className="p-0 aspect-square flex-grow relative group">
            {image.imageDataUrl ? (
              <>
                <img
                  src={image.imageDataUrl}
                  alt={image.promptText || "Generated Character"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 right-2 flex justify-between gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDownload(image.imageDataUrl!, image.id);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const shareUrl = `${window.location.origin}/generations/${image.id}`;
                      sdk.isInMiniApp().then((isInMiniApp) => {
                        if (isInMiniApp) {
                          sdk.actions.composeCast({
                            text: `Check out my new character! ${shareUrl}`,
                            embeds: [shareUrl],
                          });
                        } else {
                          // Share to twitter
                          window.open(
                            `https://x.com/intent/tweet?text=Check%20out%20my%20new%20character!%20${shareUrl}`,
                            "_blank"
                          );
                        }
                      });
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
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
              {image.createdAt && (
                <p className="text-xs text-muted-foreground/80 mt-1">
                  {new Date(image.createdAt).toLocaleDateString()}
                </p>
              )}
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
}
