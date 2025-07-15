"use client";

import { AuthModal } from "@/components/AuthModal";
import { ImageSelector } from "@/components/ImageSelector";
import { ThemeGrid } from "@/components/ThemeGrid";
import { useMiniApp } from "@/hooks/use-mini-app";
import { useAuth } from "@/hooks/useAuth";
import {
  checkIfResizeNeeded,
  convertGifToPng,
  isGifFile,
  resizeImage,
} from "@/lib/image-utils";
import themes from "@/lib/themes";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";

export default function Page() {
  const { connect, connectors } = useConnect();
  const { address, isConnected } = useAccount();
  const { isAuthenticated, user, signInWithSiwe, isLoading } = useAuth();
  const isInMiniApp = useMiniApp();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasAttemptedSignIn, setHasAttemptedSignIn] = useState(false);

  // Image upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [useUploadedImage, setUseUploadedImage] = useState<boolean>(false);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  // Theme selection state
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("");

  // Auto-connect in mini app context
  useEffect(() => {
    if (
      isInMiniApp &&
      !isAuthenticated &&
      connectors.length > 0 &&
      !isConnecting
    ) {
      handleMiniAppConnect();
    }
  }, [isInMiniApp, isAuthenticated, connectors, isConnecting]);

  // Auto-trigger SIWE when wallet connects in mini app
  useEffect(() => {
    if (
      isInMiniApp &&
      isConnected &&
      address &&
      !hasAttemptedSignIn &&
      isConnecting
    ) {
      setHasAttemptedSignIn(true);
      handleSiweSignIn();
    }
  }, [isInMiniApp, isConnected, address, hasAttemptedSignIn, isConnecting]);

  // Auto-show auth modal when not authenticated and not in mini app
  useEffect(() => {
    if (!isAuthenticated && !isInMiniApp && !isLoading && !showAuthModal) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated, isInMiniApp, isLoading, showAuthModal]);

  // Auto-close auth modal when authenticated
  useEffect(() => {
    if (isAuthenticated && showAuthModal) {
      setShowAuthModal(false);
    }
  }, [isAuthenticated, showAuthModal]);

  const handleMiniAppConnect = async () => {
    setIsConnecting(true);
    setHasAttemptedSignIn(false);
    try {
      await connect({ connector: connectors[0] });
    } catch (error) {
      console.error("Connection failed:", error);
      setIsConnecting(false);
    }
  };

  const handleSiweSignIn = async () => {
    try {
      await signInWithSiwe();
    } catch (error) {
      console.error("Sign in failed:", error);
    } finally {
      setIsConnecting(false);
      setHasAttemptedSignIn(false);
    }
  };

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

  if (isLoading || isConnecting) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-16 px-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-8">
          Sign in
        </h1>

        {!isAuthenticated && !isInMiniApp && (
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>Please connect your wallet to continue</p>
          </div>
        )}

        <AuthModal isOpen={showAuthModal} onOpenChange={setShowAuthModal} />
      </div>
    );
  }

  // Show creation screen if authenticated
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-8">
        Create your stylized profile picture
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
