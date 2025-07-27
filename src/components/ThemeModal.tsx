"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useImageSelection } from "@/providers/ImageSelectionProvider";
import { useMiniAppContext } from "@/providers/MiniAppContextProvider";
import { GitBranch, Image, Pencil, Star, Upload, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { PromptDisplay } from "./PromptDisplay";
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
  onProceed: (params: { prompt: string; referrerId?: string }) => void;
  onFork?: (prompt: string) => void;
  onThemeChange?: (theme: ThemeModalProps["selectedTheme"]) => void;
  uploadedImage?: string | null;
  isLoading?: boolean;
  displayName?: string;
  username?: string;
}

export function ThemeModal({
  open,
  onOpenChange,
  selectedTheme,
  tempCustomPrompt,
  onTempCustomPromptChange,
  onProceed,
  onFork,
  onThemeChange,
  uploadedImage,
  isLoading = false,
  displayName,
  username,
}: ThemeModalProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [showImagePopover, setShowImagePopover] = useState(false);

  const { context } = useMiniAppContext();
  const isInMiniApp = !!context;
  const userProfileImage = context?.user?.pfpUrl;
  const userDisplayName = context?.user?.displayName;
  const userUsername = context?.user?.username;

  const {
    selectedImage,
    profileImage,
    customImage,
    useUploadedImage,
    triggerFileInput,
    setUseUploadedImage,
    clearUploadedImage,
    fileInputRef,
    uploadImage,
  } = useImageSelection();

  // Use the uploadedImage from props if available, otherwise use from hook
  const imageToUse = selectedImage;
  const hasImage = !!imageToUse;

  // Use context user info if available, otherwise fall back to hook data
  const profileImageToUse = userProfileImage || profileImage;
  const hasProfileImageToUse = !!profileImageToUse;

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

  const handleProceed = () => {
    if (!hasImage) return; // Don't proceed if no image uploaded

    if (selectedTheme?.id === "custom") {
      onProceed({ prompt: tempCustomPrompt });
    } else if (selectedTheme) {
      const referrerId = selectedTheme.selectedImage?.id;
      onProceed({ prompt: selectedTheme.prompt, referrerId });
    }
    onOpenChange(false);
  };

  const handleFork = () => {
    if (!selectedTheme) return;

    const promptToFork =
      selectedTheme.id === "custom" ? tempCustomPrompt : selectedTheme.prompt;

    // Switch to custom theme mode within the same modal
    const customTheme = {
      id: "custom",
      name: "Custom",
      prompt: promptToFork,
    };

    // Update the selected theme to custom mode and populate the custom prompt
    if (onThemeChange && promptToFork) {
      onThemeChange(customTheme);
      onTempCustomPromptChange(promptToFork);
    }
  };

  const handleImageSelection = (useProfile: boolean) => {
    if (useProfile && !profileImageToUse) return;
    setUseUploadedImage(!useProfile);
    setShowImagePopover(false);
  };

  const handleUploadImage = () => {
    triggerFileInput();
    setShowImagePopover(false);
  };

  const getInitials = () => {
    // Use context user info if available, otherwise fall back to props
    const nameToUse =
      userDisplayName || userUsername || displayName || username;
    if (!nameToUse) return "??";
    const names = nameToUse.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return nameToUse.substring(0, 2).toUpperCase();
  };

  const renderImageSelectionPopover = () => {
    if (!isInMiniApp || !hasProfileImageToUse) return null;

    return (
      <PopoverContent className="w-56 p-2">
        <div className="space-y-2">
          <button
            onClick={() => handleImageSelection(true)}
            className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
          >
            <Avatar className="w-6 h-6">
              <AvatarImage src={profileImageToUse || undefined} alt="Profile" />
              <AvatarFallback className="text-xs">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Profile image</span>
              {userUsername && (
                <span className="text-xs text-muted-foreground">
                  @{userUsername}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={handleUploadImage}
            className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <span className="text-sm">Upload image</span>
          </button>
        </div>
      </PopoverContent>
    );
  };

  const renderImageSelectionButton = () => {
    const isMobile = useIsMobile();

    if (hasImage) {
      return (
        <div className={`flex items-center gap-3 ${isMobile ? "w-full" : ""}`}>
          {/* Image preview - clickable to change image */}
          {isInMiniApp && hasProfileImageToUse ? (
            <Popover open={showImagePopover} onOpenChange={setShowImagePopover}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-9 h-9 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0 relative group"
                >
                  <img
                    src={imageToUse}
                    alt="Selected image"
                    className="w-full h-full object-cover"
                  />
                  {/* Hover overlay with pencil icon */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <Pencil className="h-3 w-3 text-white" />
                  </div>
                </button>
              </PopoverTrigger>
              {renderImageSelectionPopover()}
            </Popover>
          ) : (
            <button
              type="button"
              onClick={triggerFileInput}
              className="w-9 h-9 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0 relative group"
            >
              <img
                src={imageToUse}
                alt="Selected image"
                className="w-full h-full object-cover"
              />
              {/* Hover overlay with pencil icon */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <Pencil className="h-3 w-3 text-white" />
              </div>
            </button>
          )}
          <Button
            type="button"
            onClick={handleProceed}
            disabled={isLoading}
            className={isMobile ? "flex-1" : ""}
          >
            Proceed
          </Button>
        </div>
      );
    }

    if (isInMiniApp && hasProfileImageToUse) {
      return (
        <Popover open={showImagePopover} onOpenChange={setShowImagePopover}>
          <PopoverTrigger asChild>
            <Button type="button" className={isMobile ? "w-full" : ""}>
              <Image className="w-4 h-4" />
              Choose image
            </Button>
          </PopoverTrigger>
          {renderImageSelectionPopover()}
        </Popover>
      );
    }

    return (
      <Button
        type="button"
        onClick={triggerFileInput}
        className={isMobile ? "w-full" : ""}
      >
        <Image className="w-4 h-4" />
        Choose image
      </Button>
    );
  };

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className="sm:max-w-md">
        <CredenzaHeader>
          <CredenzaTitle>Theme</CredenzaTitle>
        </CredenzaHeader>
        <CredenzaBody>
          {/* Loading state with skeletons */}
          {isLoading ? (
            <div className="space-y-4">
              {/* Image carousel skeleton */}
              <div className="mb-4">
                <div className="w-full max-w-sm mx-auto">
                  <Skeleton className="w-full aspect-square rounded-md" />
                </div>
              </div>

              {/* Prompt skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>

              {/* Creator and usage info skeleton */}
              <div className="flex items-center justify-between mt-4">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ) : (
            <>
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
              {selectedTheme?.id === "custom" ? (
                <textarea
                  value={tempCustomPrompt}
                  onChange={(e) => onTempCustomPromptChange(e.target.value)}
                  placeholder="Enter your custom prompt..."
                  className="w-full p-3 border border-gray-300 rounded-md min-h-[120px] resize-none"
                />
              ) : (
                <PromptDisplay promptText={selectedTheme?.prompt || ""} />
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
            </>
          )}
        </CredenzaBody>
        <CredenzaFooter className="justify-end">
          <div className="flex items-center gap-2">
            {renderImageSelectionButton()}
            {onFork && selectedTheme && selectedTheme.id !== "custom" && (
              <Button
                type="button"
                onClick={handleFork}
                disabled={isLoading}
                variant="outline"
                size="icon"
                className="flex-shrink-0"
                title="Fork this prompt"
              >
                <GitBranch className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  );
}
