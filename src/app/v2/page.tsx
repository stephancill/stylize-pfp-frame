"use client";

import { ImageSelector } from "@/components/ImageSelector";
import { ThemeGrid } from "@/components/ThemeGrid";
import {
  checkIfResizeNeeded,
  convertGifToPng,
  isGifFile,
  resizeImage,
} from "@/lib/image-utils";
import themes from "@/lib/themes";
import { useState } from "react";

export default function Page() {
  // Image upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [useUploadedImage, setUseUploadedImage] = useState<boolean>(false);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  // Theme selection state
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("");

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let dataUrl: string;

      // Check if the file is a GIF and convert it to PNG
      if (isGifFile(file)) {
        dataUrl = await convertGifToPng(file);
      } else {
        // Check if the image needs to be resized
        const needsResize = await checkIfResizeNeeded(file, 1024, 1024);

        if (needsResize) {
          // Resize the image while maintaining aspect ratio
          dataUrl = await resizeImage(file, {
            maxWidth: 1024,
            maxHeight: 1024,
            quality: 0.9,
          });
        } else {
          // For smaller images, read directly as data URL
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              resolve(result);
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file);
          });
        }
      }

      setUploadedImage(dataUrl);
      setUseUploadedImage(true);
    } catch (error) {
      console.error("Error processing image:", error);
      setApiMessage(
        error instanceof Error ? error.message : "Failed to process image"
      );
    }
  };

  const handleClearUploadedImage = () => {
    setUploadedImage(null);
    setUseUploadedImage(false);
  };

  const handleThemeSelect = (themeId: string) => {
    setSelectedThemeId(themeId);
    setCustomPrompt(""); // Clear custom prompt when a theme is selected
  };

  const handleCustomPromptChange = (prompt: string) => {
    setCustomPrompt(prompt);
    if (prompt.trim()) {
      // Clear selected theme when custom prompt is entered
      setSelectedThemeId("");
    }
  };

  const getSelectedPrompt = (): string => {
    if (customPrompt) return customPrompt;
    if (selectedThemeId) {
      const selectedTheme = themes.find((t) => t.id === selectedThemeId);
      return selectedTheme?.prompt || "";
    }
    return ""; // No theme selected and no custom prompt
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-8">
        Create
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image selection column */}
        <div className="space-y-6">
          <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
            1. Choose an image
          </h2>

          <div className="max-w-lg">
            <ImageSelector
              profileImageUrl={undefined} // Could be enhanced to use user's profile image from auth
              displayName={undefined} // Could be enhanced to use user's display name from auth
              username={undefined} // User data not readily available in current auth structure
              uploadedImage={uploadedImage}
              useUploadedImage={useUploadedImage}
              onImageUpload={handleImageUpload}
              onUseUploadedImageChange={setUseUploadedImage}
              onClearUploadedImage={handleClearUploadedImage}
              onError={setApiMessage}
            />

            {apiMessage && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{apiMessage}</p>
              </div>
            )}
          </div>
        </div>

        {/* Theme selection column */}
        <div className="space-y-6">
          <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
            2. Pick a theme
          </h2>

          <div className="max-w-lg">
            <ThemeGrid
              selectedThemeId={selectedThemeId}
              customPrompt={customPrompt}
              onThemeSelect={handleThemeSelect}
              onCustomPromptChange={handleCustomPromptChange}
              uploadedImage={uploadedImage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
