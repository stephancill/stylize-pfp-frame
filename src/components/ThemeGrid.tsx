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
import { fetchAuth } from "@/lib/fetch-auth";
import { useQuery } from "@tanstack/react-query";
import { Plus, Star, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface StandardizedUser {
  username: string;
  avatar: string | null;
  source: "farcaster" | "ens" | "basename";
}

interface ServerTheme {
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

interface ThemeGridProps {
  selectedThemeId: string;
  customPrompt: string;
  onThemeSelect: (themeId: string) => void;
  onCustomPromptChange: (prompt: string) => void;
  uploadedImage?: string | null;
}

export function ThemeGrid({
  selectedThemeId,
  customPrompt,
  onThemeSelect,
  onCustomPromptChange,
  uploadedImage,
}: ThemeGridProps) {
  const [showCredenza, setShowCredenza] = useState(false);
  const [selectedTheme, setSelectedThemeForCredenza] = useState<{
    id: string;
    name: string;
    prompt: string;
    usageCount?: number;
    author?: ServerTheme["author"];
    selectedImage?: ServerTheme["images"][0];
    images?: ServerTheme["images"];
  } | null>(null);
  const [tempCustomPrompt, setTempCustomPrompt] = useState("");
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  // Fetch themes from server using React Query
  const { data: serverThemes = [], isLoading } = useQuery<ServerTheme[]>({
    queryKey: ["themes"],
    queryFn: async () => {
      const response = await fetchAuth("/api/themes");
      if (!response.ok) {
        throw new Error("Failed to fetch themes");
      }
      const data = await response.json();
      return data.themes || [];
    },
  });

  const handleThemeClick = (
    theme: ServerTheme,
    selectedImage?: ServerTheme["images"][0]
  ) => {
    setSelectedThemeForCredenza({
      id: `theme-${theme.promptText}`,
      name: theme.author?.username || "Community",
      prompt: theme.promptText,
      usageCount: theme.usageCount,
      author: theme.author,
      selectedImage,
      images: theme.images,
    });
    setShowCredenza(true);
  };

  // Focus on the initially selected image when credenza opens
  useEffect(() => {
    if (
      showCredenza &&
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
  }, [showCredenza, selectedTheme, carouselApi]);

  const handleCustomClick = () => {
    setSelectedThemeForCredenza({
      id: "custom",
      name: "Custom",
      prompt: customPrompt,
    });
    setTempCustomPrompt(customPrompt);
    setShowCredenza(true);
  };

  const handleProceed = () => {
    if (!uploadedImage) return; // Don't proceed if no image uploaded

    if (selectedTheme?.id === "custom") {
      onCustomPromptChange(tempCustomPrompt);
    } else if (selectedTheme) {
      onThemeSelect(selectedTheme.id);
    }
    setShowCredenza(false);
  };

  const handleCancel = () => {
    setShowCredenza(false);
    setSelectedThemeForCredenza(null);
  };

  return (
    <div className="w-full space-y-6">
      {/* Custom Option */}
      <div
        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={handleCustomClick}
      >
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-md flex items-center justify-center">
            <Plus className="h-8 w-8 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Custom Theme
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create your own unique style
            </p>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading themes...</p>
        </div>
      )}

      {/* Server Theme Options */}
      {!isLoading &&
        serverThemes.map((theme, index) => (
          <div
            key={`theme-${index}`}
            className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => handleThemeClick(theme)}
          >
            {/* Image row */}
            <div className="grid grid-cols-3 gap-2">
              {theme.images.slice(0, 3).map((image, imgIndex) => (
                <div
                  key={image.id}
                  className="relative group cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleThemeClick(theme, image);
                  }}
                >
                  <div className="aspect-square rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700">
                    {image.urls.output ? (
                      <img
                        src={image.urls.output}
                        alt={`Theme variation ${imgIndex + 1}`}
                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-gray-400">
                          No preview
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Reference count badge */}
                  {image.referenceCount > 0 && (
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      <span>{image.referenceCount}</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Fill empty slots */}
              {theme.images.length < 3 &&
                Array(3 - theme.images.length)
                  .fill(null)
                  .map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="aspect-square rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
                    >
                      <span className="text-xs text-gray-400">No preview</span>
                    </div>
                  ))}
            </div>

            {/* Prompt description */}
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {theme.promptText}
            </p>

            {/* Author info with profile image */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
                {theme.author?.avatar && (
                  <img
                    src={theme.author.avatar}
                    alt={theme.author.username || "User"}
                    className="w-3 h-3 rounded-full"
                  />
                )}
                <span>@{theme.author?.username || "community"}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
                <Users className="h-3 w-3" />
                <span>{theme.usageCount}</span>
              </div>
            </div>
          </div>
        ))}

      {/* Credenza Dialog */}
      <Credenza open={showCredenza} onOpenChange={setShowCredenza}>
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
                onChange={(e) => setTempCustomPrompt(e.target.value)}
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
            <Button
              type="button"
              onClick={handleProceed}
              disabled={!uploadedImage}
            >
              {!uploadedImage ? "Upload input image" : "Proceed"}
            </Button>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </div>
  );
}
