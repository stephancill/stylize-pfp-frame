"use client";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import sdk from "@farcaster/frame-sdk";
import {
  checkIfResizeNeeded,
  convertGifToPng,
  isGifFile,
  resizeImage,
} from "@/lib/image-utils";
import { useMiniAppContext } from "./MiniAppContextProvider";

interface ImageSelectionContextType {
  // State
  uploadedImage: string | null;
  useUploadedImage: boolean;
  isLoading: boolean;
  error: string | null;

  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  // Actions
  uploadImage: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  clearUploadedImage: () => void;
  setUseUploadedImage: (useUploaded: boolean) => void;
  setError: (error: string | null) => void;
  triggerFileInput: () => void;
  setProfileImage: (imageUrl: string | null) => void;

  // Images
  selectedImage: string | null;
  profileImage: string | null;
  customImage: string | null;
}

const ImageSelectionContext = createContext<
  ImageSelectionContextType | undefined
>(undefined);

export function ImageSelectionProvider({ children }: { children: ReactNode }) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [useUploadedImage, setUseUploadedImage] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [overrideProfileImage, setOverrideProfileImage] = useState<
    string | null
  >(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { context } = useMiniAppContext();

  // Set initial loading state based on context availability
  useEffect(() => {
    setIsLoading(false);
  }, [context]);

  // Upload image handler
  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image file size must be less than 5MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    try {
      setError(null);
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
      setError(
        error instanceof Error ? error.message : "Failed to process image"
      );
    }
  };

  // Clear uploaded image
  const clearUploadedImage = () => {
    setUploadedImage(null);
    setUseUploadedImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Image values
  const profileImage = overrideProfileImage || context?.user?.pfpUrl || null;
  const customImage = uploadedImage;
  const selectedImage = useUploadedImage ? customImage : profileImage;

  const value: ImageSelectionContextType = {
    // State
    uploadedImage,
    useUploadedImage,
    isLoading,
    error,

    // Refs
    fileInputRef,

    // Actions
    uploadImage,
    clearUploadedImage,
    setUseUploadedImage,
    setError,
    triggerFileInput: () => fileInputRef.current?.click(),
    setProfileImage: setOverrideProfileImage,

    // Images
    selectedImage,
    profileImage,
    customImage,
  };

  return (
    <ImageSelectionContext.Provider value={value}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={uploadImage}
        className="hidden"
      />
      {children}
    </ImageSelectionContext.Provider>
  );
}

export function useImageSelection() {
  const context = useContext(ImageSelectionContext);
  if (context === undefined) {
    throw new Error(
      "useImageSelection must be used within an ImageSelectionProvider"
    );
  }
  return context;
}
