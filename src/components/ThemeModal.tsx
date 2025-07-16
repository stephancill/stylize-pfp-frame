"use client";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza";
import { Star, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { type ServerTheme } from "./ThemeRow";

interface ThemeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTheme: {
    id: string;
    name: string;
    prompt: string;
    usageCount?: number;
    author?: ServerTheme["author"];
    selectedImage?: ServerTheme["images"][0];
    images?: ServerTheme["images"];
  } | null;
  tempCustomPrompt: string;
  onTempCustomPromptChange: (prompt: string) => void;
  onProceed: () => void;
  uploadedImage?: string | null;
}

export function ThemeModal({
  open,
  onOpenChange,
  selectedTheme,
  tempCustomPrompt,
  onTempCustomPromptChange,
  onProceed,
  uploadedImage,
}: ThemeModalProps) {
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  // Focus on the initially selected image when credenza opens
  useEffect(() => {
    if (
      open &&
      selectedTheme?.selectedImage &&
      selectedTheme?.images &&
      carouselApi
    ) {
      const selectedIndex = selectedTheme.images.findIndex(
        (img) => img.id === selectedTheme.selectedImage?.id
      );
      if (selectedIndex !== -1) {
        // Use setTimeout to ensure the carousel is fully initialized
        setTimeout(() => {
          carouselApi.scrollTo(selectedIndex);
        }, 100);
      }
    }
  }, [open, selectedTheme, carouselApi]);

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className="sm:max-w-md">
        <CredenzaHeader>
          <CredenzaTitle>Theme</CredenzaTitle>
        </CredenzaHeader>
        <CredenzaBody>
          {/* Image carousel */}
          {selectedTheme?.id !== "custom" && (
            <div className="mb-4">
              <Carousel
                setApi={setCarouselApi}
                className="w-full max-w-sm mx-auto"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {selectedTheme?.images?.map((image, index) => (
                    <CarouselItem
                      key={image.id}
                      className="pl-2 md:pl-4 basis-4/5 md:basis-3/4"
                    >
                      <div className="relative w-full aspect-square rounded-md overflow-hidden">
                        {image.urls.output ? (
                          <img
                            src={image.urls.output}
                            alt={`Theme variation ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center border border-dashed">
                            <span className="text-sm text-gray-500">
                              No preview
                            </span>
                          </div>
                        )}

                        {/* Reference count badge */}
                        {image.referenceCount > 0 && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            <span>{image.referenceCount}</span>
                          </div>
                        )}

                        {/* Author badge */}
                        {image.creator && (
                          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                            {image.creator.avatar && (
                              <img
                                src={image.creator.avatar}
                                alt={image.creator.username || "Creator"}
                                className="w-3 h-3 rounded-full"
                              />
                            )}
                            <span>
                              {image.creator.username
                                ? `@${image.creator.username}`
                                : "Unknown"}
                            </span>
                          </div>
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
            </div>
          )}

          {/* Expandable prompt */}
          {selectedTheme?.id === "custom" ? (
            <textarea
              value={tempCustomPrompt}
              onChange={(e) => onTempCustomPromptChange(e.target.value)}
              placeholder="Enter your custom prompt..."
              className="w-full p-3 border border-gray-300 rounded-md min-h-[120px] resize-none"
            />
          ) : (
            <div>
              <p
                className={`text-sm text-muted-foreground whitespace-pre-wrap cursor-pointer ${
                  !showFullPrompt ? "line-clamp-2" : ""
                }`}
                onClick={() => {
                  if (
                    selectedTheme?.prompt &&
                    selectedTheme.prompt.length > 100
                  ) {
                    setShowFullPrompt(!showFullPrompt);
                  }
                }}
              >
                {selectedTheme?.prompt}
              </p>
              {selectedTheme?.prompt && selectedTheme.prompt.length > 100 && (
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

          {/* Creator and usage info row */}
          <div className="flex items-center justify-between mt-4">
            {/* Creator badge */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
              {selectedTheme?.author?.avatar && (
                <img
                  src={selectedTheme.author.avatar}
                  alt={selectedTheme.author.username || "Creator"}
                  className="w-3 h-3 rounded-full"
                />
              )}
              <span>
                {selectedTheme?.author?.username
                  ? `@${selectedTheme.author.username}`
                  : "Unknown"}
              </span>
            </div>

            {/* Users of the theme */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
              <Users className="h-3 w-3" />
              <span>{selectedTheme?.usageCount || "New"}</span>
            </div>
          </div>
        </CredenzaBody>
        <CredenzaFooter className="sm:justify-end">
          <Button type="button" onClick={onProceed} disabled={!uploadedImage}>
            {!uploadedImage ? "Upload input image" : "Proceed"}
          </Button>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  );
}
