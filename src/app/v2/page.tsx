"use client";

import { ImageSelector } from "@/components/ImageSelector";
import { ThemeGrid } from "@/components/ThemeGrid";
import { ThemeModal } from "@/components/ThemeModal";
import { PaymentModal } from "@/components/PaymentModal";
import {
  checkIfResizeNeeded,
  convertGifToPng,
  isGifFile,
  resizeImage,
} from "@/lib/image-utils";
import themes from "@/lib/themes";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/providers/UserContextProvider";
import { useAccount } from "wagmi";
import { createUnifiedUser } from "@/types/user";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Page() {
  const { user: farcasterUser, isLoading: isUserLoading } = useUser();
  const { address: connectedAddress } = useAccount();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unified Authentication (supports both SIWE and Farcaster)
  const {
    isAuthenticated,
    user: authUser,
    isLoading: isAuthLoading,
  } = useAuth();

  // Create unified user
  const unifiedUser = createUnifiedUser(farcasterUser, connectedAddress);

  // Determine if we're in a Farcaster context
  const isInFarcasterContext = !!farcasterUser;

  // User has valid authentication if they have either:
  // 1. Farcaster user AND authenticated via Farcaster, OR
  // 2. Wallet connected AND authenticated via SIWE
  const hasValidAuth =
    isAuthenticated &&
    ((isInFarcasterContext &&
      authUser?.authType === "farcaster" &&
      authUser?.fid === farcasterUser?.fid) ||
      (!isInFarcasterContext &&
        authUser?.authType === "siwe" &&
        authUser?.address?.toLowerCase() === connectedAddress?.toLowerCase()));

  // Image upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [useUploadedImage, setUseUploadedImage] = useState<boolean>(false);

  // Theme selection state
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("");

  // Modal/credenza state for promptId in URL
  const [showCredenza, setShowCredenza] = useState(false);
  const [selectedTheme, setSelectedThemeForCredenza] = useState<any>(null);
  const [tempCustomPrompt, setTempCustomPrompt] = useState("");

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentModalData, setPaymentModalData] = useState<{
    prompt: string | undefined;
    imageUrl: string | undefined;
    referringImageId: string | undefined;
  }>({
    prompt: undefined,
    imageUrl: undefined,
    referringImageId: undefined,
  });

  const searchParams = useSearchParams();
  const promptId = searchParams.get("promptId");

  // Fetch theme by promptId if present
  const {
    data: fetchedTheme,
    isLoading: isLoadingTheme,
    error: themeError,
  } = useQuery({
    queryKey: ["theme", promptId],
    queryFn: async () => {
      if (!promptId) return null;
      const res = await fetch(`/api/themes/${promptId}`);
      if (!res.ok) throw new Error("Failed to fetch theme");
      const data = await res.json();
      return data.theme;
    },
    enabled: !!promptId,
  });

  // Show credenza immediately when promptId is detected, and update when theme is fetched
  useEffect(() => {
    if (promptId) {
      setShowCredenza(true);

      if (fetchedTheme) {
        setSelectedThemeForCredenza({
          id: `theme-${fetchedTheme.promptText}`,
          name: fetchedTheme.author?.username || "Community",
          prompt: fetchedTheme.promptText,
          usageCount: fetchedTheme.usageCount,
          author: fetchedTheme.author,
          selectedImage: fetchedTheme.originalImage,
          images: [
            fetchedTheme.originalImage,
            ...(fetchedTheme.topReferencedImages || []),
          ],
        });
      }
    }
  }, [promptId, fetchedTheme]);

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
      toast.error("Error processing image", {
        description:
          error instanceof Error ? error.message : "Failed to process image",
      });
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

  // Centralized proceed function
  const handleProceed = ({
    prompt,
    referrerId,
  }: {
    prompt: string;
    referrerId?: string;
  }) => {
    if (!uploadedImage) return; // Don't proceed if no image uploaded

    // Check if user is authenticated
    if (!hasValidAuth) {
      toast.error("Authentication required", {
        description: "Please authenticate to continue.",
      });
      return;
    }

    // Get the image to use
    const imageToUse = useUploadedImage
      ? uploadedImage
      : unifiedUser?.profileImage;
    if (!imageToUse) {
      toast.error("Image required", {
        description: "Please upload an image to stylize.",
      });
      return;
    }

    // Set up payment modal
    setPaymentModalData({
      prompt,
      imageUrl: imageToUse,
      referringImageId: referrerId,
    });
    setShowPaymentModal(true);
  };

  // Handle payment completion
  const handlePaymentComplete = () => {
    // Clear image and theme selection
    setUploadedImage(null);
    setUseUploadedImage(false);
    setSelectedThemeId("");
    setCustomPrompt("");

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    toast.success("Payment successful!", {
      description:
        "Your image is being generated. Check back in a few minutes.",
      action: {
        label: "View Queue",
        onClick: () => router.push("/v2/gallery"),
      },
      duration: Infinity,
    });

    // Show additional toast for notifications if user is in Farcaster context
    if (farcasterUser) {
      setTimeout(() => {
        toast.info("Stay updated!", {
          description:
            "Enable notifications to get updates when your character is ready.",
          action: {
            label: "Enable",
            onClick: () => {
              // This would typically open a notification permission dialog
              // For now, we'll just show a message
              toast.success("Notifications enabled!", {
                description: "You'll be notified when your character is ready.",
              });
            },
          },
          duration: 8000,
        });
      }, 2000);
    }
  };

  // Show loading state while authentication is being checked
  if (isUserLoading || isAuthLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-8">
        Create
      </h1>

      {/* Authentication Required Message */}
      {!hasValidAuth && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            Authentication Required
          </h3>
          <p className="text-blue-600">
            To generate characters, please sign in with your wallet or Farcaster
            account.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image selection column */}
        <div className="space-y-6">
          <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
            1. Choose an image
          </h2>

          <div className="max-w-lg">
            <ImageSelector
              profileImageUrl={unifiedUser?.profileImage}
              displayName={unifiedUser?.displayName}
              username={unifiedUser?.username}
              uploadedImage={uploadedImage}
              onImageUpload={handleImageUpload}
              onUseUploadedImageChange={setUseUploadedImage}
              onClearUploadedImage={handleClearUploadedImage}
              onError={(error) => toast.error("Error", { description: error })}
              fileInputRef={fileInputRef}
            />
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
              handleProceed={handleProceed}
            />
          </div>
        </div>
      </div>

      {/* Theme Modal for promptId in URL */}
      <ThemeModal
        open={showCredenza}
        onOpenChange={setShowCredenza}
        selectedTheme={selectedTheme}
        tempCustomPrompt={tempCustomPrompt}
        onTempCustomPromptChange={setTempCustomPrompt}
        onProceed={handleProceed}
        uploadedImage={uploadedImage}
        isLoading={isLoadingTheme}
      />

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        prompt={paymentModalData.prompt || ""}
        imageUrl={paymentModalData.imageUrl}
        userId={
          authUser?.authType === "farcaster"
            ? authUser.fid?.toString() || unifiedUser?.id || ""
            : authUser?.address || unifiedUser?.id || ""
        }
        referringImageId={paymentModalData.referringImageId}
        onSuccess={handlePaymentComplete}
        onError={(error) => {
          toast.error("Payment error", {
            description: error,
          });
        }}
      />
    </div>
  );
}
