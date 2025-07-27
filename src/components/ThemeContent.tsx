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
import { GitBranch, Star, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { PromptDisplay } from "./PromptDisplay";
import { type ServerTheme } from "./ThemeRow";

interface ThemeContentProps {
  selectedTheme: {
    id: string;
    name: string;
    prompt: string;
    usageCount?: number;
    author?: ServerTheme["author"];
    selectedImage?: ServerTheme["images"][0];
    images?: ServerTheme["images"];
  } | null;
  tempCustomPrompt?: string;
  onTempCustomPromptChange?: (prompt: string) => void;
  onFork?: (prompt: string) => void;
  showForkButton?: boolean;
  className?: string;
}

export function ThemeContent({
  selectedTheme,
  tempCustomPrompt = "",
  onTempCustomPromptChange,
  onFork,
  showForkButton = true,
  className = "",
}: ThemeContentProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  // Focus on the initially selected image when component mounts/updates
  useEffect(() => {
    if (selectedTheme?.selectedImage && selectedTheme?.images && carouselApi) {
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
  }, [selectedTheme, carouselApi]);

  const handleFork = () => {
    if (!selectedTheme || !onFork) return;

    const promptToFork =
      selectedTheme.id === "custom" ? tempCustomPrompt : selectedTheme.prompt;

    if (promptToFork) {
      onFork(promptToFork);
    }
  };

  if (!selectedTheme) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Image carousel */}
      {selectedTheme.id !== "custom" && selectedTheme.images && (
        <div className="mb-4">
          <Carousel setApi={setCarouselApi} className="w-full max-w-sm mx-auto">
            <CarouselContent className="-ml-2 md:-ml-4">
              {selectedTheme.images.map((image, index) => (
                <CarouselItem
                  key={image.id}
                  className="pl-2 md:pl-4 basis-4/5 md:basis-3/4"
                >
                  <div className="relative w-full aspect-square rounded-md overflow-hidden">
                    {image.urls.output && (
                      <img
                        src={image.urls.output}
                        alt={`Theme variation ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
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
      {selectedTheme.id === "custom" && onTempCustomPromptChange ? (
        <textarea
          value={tempCustomPrompt}
          onChange={(e) => onTempCustomPromptChange(e.target.value)}
          placeholder="Enter your custom prompt..."
          className="w-full p-3 border border-gray-300 rounded-md min-h-[120px] resize-none"
        />
      ) : (
        <PromptDisplay promptText={selectedTheme.prompt || ""} />
      )}

      {/* Creator and usage info row */}
      <div className="flex items-center justify-between mt-4">
        {/* Creator badge */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
          {selectedTheme.author?.avatar && (
            <img
              src={selectedTheme.author.avatar}
              alt={selectedTheme.author.username || "Creator"}
              className="w-3 h-3 rounded-full"
            />
          )}
          <span>
            {selectedTheme.author?.username
              ? `@${selectedTheme.author.username}`
              : "Unknown"}
          </span>
        </div>

        {/* Users of the theme */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
          <Users className="h-3 w-3" />
          <span>{selectedTheme.usageCount || "New"}</span>
        </div>
      </div>

      {/* Fork button */}
      {showForkButton && onFork && selectedTheme.id !== "custom" && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleFork}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            title="Fork this prompt"
          >
            <GitBranch className="h-4 w-4" />
            Fork
          </Button>
        </div>
      )}
    </div>
  );
}
