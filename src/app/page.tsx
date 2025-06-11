"use client";

import { useUser } from "../providers/UserContextProvider";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  useSendTransaction,
  useAccount,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi";
import { Hex, parseEther } from "viem";
import { base } from "wagmi/chains";
import Image from "next/image";
import type { GeneratedImageStatus } from "@/types/db";
import { CreationsGallery } from "@/components/CreationsGallery";
import { ImageSelector } from "@/components/ImageSelector";
import { ThemeSelector, themes } from "@/components/ThemeSelector";
import { ConnectionInterface } from "@/components/ConnectionInterface";
import { StatusMessages } from "@/components/StatusMessages";
import { JobsSection } from "@/components/JobsSection";
import { FramePromptDialog } from "@/components/FramePromptDialog";
import { createUnifiedUser, type UnifiedUser } from "@/types/user";
import { truncateAddress } from "../lib/utils";
import { resizeImage, checkIfResizeNeeded } from "@/lib/image-utils";

interface GenerationRequestPayload {
  userId: string;
  prompt: string;
  userPfpUrl?: string;
}

interface GenerationRequestResponse {
  message: string;
  quoteId: string;
  paymentAddress: string;
  amountDue: string;
  calldata: Hex;
}

interface SubmitPaymentPayload {
  quoteId: string;
  transactionHash: string;
}

interface SubmitPaymentResponse {
  message: string;
  jobId?: string;
}

interface CompletedImage {
  id: string;
  imageDataUrl: string | null;
  promptText: string | null;
  createdAt: string;
  quoteId: string;
}

interface InProgressJob {
  id: string;
  promptText: string | null;
  createdAt: string;
  status: GeneratedImageStatus;
  quoteId: string;
  transactionHash: string | null;
}

const getGenerationQuoteAPI = async (
  payload: GenerationRequestPayload
): Promise<GenerationRequestResponse> => {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to get generation quote");
  }
  return response.json();
};

const submitPaymentAPI = async (
  payload: SubmitPaymentPayload
): Promise<SubmitPaymentResponse> => {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to submit payment proof");
  }
  return response.json();
};

export default function Home() {
  const { user: farcasterUser, isLoading: isUserLoading } = useUser();
  const { address: connectedAddress } = useAccount();
  const account = useAccount();

  // Create unified user
  const unifiedUser = createUnifiedUser(farcasterUser, connectedAddress);
  const hasAuth = !!unifiedUser;

  // State management
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string>(themes[0].id);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [useUploadedImage, setUseUploadedImage] = useState<boolean>(false);
  const [showFramePromptDialog, setShowFramePromptDialog] =
    useState<boolean>(false);

  // Transaction state
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState<
    | "initial"
    | "quote_requested"
    | "awaiting_payment"
    | "payment_processing"
    | "payment_submitted"
    | "job_queued"
    | "error"
  >("initial");
  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | undefined>(
    undefined
  );
  const [isPaymentSubmitted, setIsPaymentSubmitted] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollingQuoteId, setPollingQuoteId] = useState<string | null>(null);

  // Wagmi hooks
  const {
    data: sendTxData,
    error: sendTxError,
    isPending: isSendingTx,
    sendTransaction,
  } = useSendTransaction();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmationError,
  } = useWaitForTransactionReceipt({
    hash: sendTxData,
    confirmations: 1,
  });

  const { switchChainAsync } = useSwitchChain();

  // Queries
  const {
    data: completedImages = [],
    isLoading: isLoadingImages,
    error: imagesError,
    refetch: refetchImages,
  } = useQuery<CompletedImage[]>({
    queryKey: ["completedImages", unifiedUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/user/${unifiedUser!.id}/images`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch images");
      }
      const data = await response.json();
      return data.images || [];
    },
    enabled: !!unifiedUser?.id,
  });

  const { data: inProgressJobs = [], refetch: refetchJobs } = useQuery<
    InProgressJob[]
  >({
    queryKey: ["inProgressJobs", unifiedUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/user/${unifiedUser!.id}/jobs`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch jobs");
      }
      const data = await response.json();
      return data.jobs || [];
    },
    enabled: !!unifiedUser?.id,
  });

  // Mutations
  const quoteMutation = useMutation<
    GenerationRequestResponse,
    Error,
    GenerationRequestPayload
  >({
    mutationFn: getGenerationQuoteAPI,
    onSuccess: async (data) => {
      console.log("Quote received:", data);
      setQuoteId(data.quoteId);
      setApiMessage("Quote received, preparing transaction...");

      if (!connectedAddress) {
        setApiMessage("Please connect your wallet to proceed with payment.");
        setGenerationStep("awaiting_payment");
        return;
      }

      try {
        const value = parseEther(data.amountDue);
        const txData = data.calldata;

        sendTransaction({
          to: data.paymentAddress as `0x${string}`,
          value: value,
          data: txData,
          chainId: base.id,
        });
        setGenerationStep("payment_processing");
      } catch (e: any) {
        console.error("Transaction preparation error:", e);
        setApiMessage(`Error: ${e.message}`);
        setGenerationStep("awaiting_payment");
      }
    },
    onError: (error) => {
      console.error("Error getting quote:", error);
      setApiMessage(`Quote Error: ${error.message}`);
      setGenerationStep("error");
    },
  });

  const paymentSubmissionMutation = useMutation<
    SubmitPaymentResponse,
    Error,
    SubmitPaymentPayload
  >({
    mutationFn: submitPaymentAPI,
    onSuccess: (data) => {
      console.log("Payment submission successful:", data);
      setPollingQuoteId(quoteId);
      setIsPolling(true);

      if (unifiedUser?.hasFarcaster) {
        setShowFramePromptDialog(true);
        setApiMessage(
          data.message ||
            "Payment verified! Waiting for image generation... (Add our frame for updates!)"
        );
      } else {
        setApiMessage(
          "Payment successful! Your character is being generated. Please check back in a few minutes - it will appear in 'Your Creations' when ready."
        );
      }

      setGenerationStep("job_queued");
      setQuoteId(null);
      setCurrentTxHash(undefined);
    },
    onError: (error) => {
      console.error("Error submitting payment:", error);
      setApiMessage(`Payment Submission Error: ${error.message}`);
      setGenerationStep("error");
      setIsPaymentSubmitted(false);
    },
  });

  // Polling query for generated images
  const {
    data: polledImage,
    isError: isPollingError,
    error: pollingError,
  } = useQuery<CompletedImage | null, Error>({
    queryKey: ["polledImage", pollingQuoteId],
    queryFn: async () => {
      if (!unifiedUser?.id || !pollingQuoteId) {
        return null;
      }
      const { data: allImages = [] } = await refetchImages();
      await refetchJobs();

      const foundImage = allImages.find(
        (img) => img.quoteId === pollingQuoteId && img.imageDataUrl
      );

      if (foundImage) {
        setApiMessage("Your new character has been generated!");
        setIsPolling(false);
        setPollingQuoteId(null);
        setGenerationStep("initial");
        return foundImage;
      }
      return null;
    },
    enabled: isPolling && !!pollingQuoteId && !!unifiedUser?.id,
    refetchInterval: (data) => {
      if (data) return false;
      return 5000;
    },
    retry: false,
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // Effects
  useEffect(() => {
    if (isUserLoading) return;
    if (!unifiedUser) return;

    const selectedTheme =
      themes.find((t) => t.id === selectedThemeId) || themes[0];
    // The prompt will be determined by getSelectedPrompt function
  }, [unifiedUser, isUserLoading, selectedThemeId]);

  useEffect(() => {
    const handleTransactionConfirmation = async () => {
      if (isConfirmed && currentTxHash && !isPaymentSubmitted) {
        setIsPaymentSubmitted(true);
        setApiMessage(
          `Transaction ${truncateAddress(
            currentTxHash
          )} confirmed on-chain. Submitting to backend for processing...`
        );
        setGenerationStep("payment_submitted");

        try {
          await paymentSubmissionMutation.mutateAsync({
            quoteId: quoteId!,
            transactionHash: currentTxHash,
          });
        } catch (error) {
          setIsPaymentSubmitted(false);
        }
      }
    };

    handleTransactionConfirmation();
  }, [isConfirmed, currentTxHash, isPaymentSubmitted]);

  useEffect(() => {
    if (sendTxData) {
      setCurrentTxHash(sendTxData);
      setApiMessage(
        `Transaction ${truncateAddress(
          sendTxData
        )} submitted to network. Waiting for on-chain confirmation...`
      );
    }
  }, [sendTxData]);

  useEffect(() => {
    if (sendTxError) {
      setApiMessage(`Transaction Error: ${sendTxError.message}`);
      setGenerationStep("awaiting_payment");
      setIsPaymentSubmitted(false);
    }
    if (confirmationError) {
      setApiMessage(`Confirmation Error: ${confirmationError.message}`);
      setGenerationStep("awaiting_payment");
      setIsPaymentSubmitted(false);
    }
  }, [sendTxError, confirmationError]);

  useEffect(() => {
    if (generationStep === "quote_requested") {
      setIsPaymentSubmitted(false);
    }
  }, [generationStep]);

  useEffect(() => {
    const handleChainSwitch = async () => {
      if (connectedAddress && account.chainId !== base.id) {
        try {
          setApiMessage("Switching to Base network...");
          await switchChainAsync({ chainId: base.id });
          setApiMessage("Successfully switched to Base network.");
        } catch (switchError: any) {
          console.error("Failed to switch network:", switchError);
          setApiMessage(
            `Failed to switch to Base network: ${switchError.message}. Please switch manually.`
          );
        }
      }
    };

    handleChainSwitch();
  }, [connectedAddress, account.chainId, switchChainAsync]);

  useEffect(() => {
    if (isPollingError && pollingError) {
      console.error("Polling error:", pollingError);
      setApiMessage(
        `Error checking for new image: ${pollingError.message}. Please refresh or try again.`
      );
      setIsPolling(false);
      setPollingQuoteId(null);
      setGenerationStep("initial");
    }
  }, [isPollingError, pollingError]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (isPolling && pollingQuoteId && unifiedUser?.id) {
      timeoutId = setTimeout(() => {
        if (isPolling) {
          setApiMessage(
            "Image generation is taking longer than expected. It will appear in 'Your Creations' when ready. You can start a new generation."
          );
          setIsPolling(false);
          setPollingQuoteId(null);
          setGenerationStep("initial");
        }
      }, 120000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isPolling, pollingQuoteId, unifiedUser?.id]);

  // Helper functions
  const getSelectedPrompt = (): string => {
    if (customPrompt) return customPrompt;
    const selectedTheme =
      themes.find((t) => t.id === selectedThemeId) || themes[0];
    return selectedTheme.prompt;
  };

  const getImageToUse = (): string | undefined => {
    if (useUploadedImage && uploadedImage) return uploadedImage;
    if (unifiedUser?.profileImage) return unifiedUser.profileImage;
    return undefined;
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Check if the image needs to be resized
      const needsResize = await checkIfResizeNeeded(file, 1024, 1024);

      let dataUrl: string;

      if (needsResize) {
        // Show a message that we're processing the image
        setApiMessage("Processing large image...");

        // Resize the image while maintaining aspect ratio
        dataUrl = await resizeImage(file, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.9,
        });

        setApiMessage("Image resized to optimize for processing.");
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

      setUploadedImage(dataUrl);
      setUseUploadedImage(true);

      // Clear the processing message after a short delay if it was shown
      if (needsResize) {
        setTimeout(() => {
          setApiMessage(null);
        }, 2000);
      } else {
        setApiMessage(null);
      }
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

  const handleRequestQuote = () => {
    if (!unifiedUser) {
      setApiMessage(
        "Please connect your wallet or sign in with Farcaster to continue."
      );
      setGenerationStep("error");
      return;
    }

    const promptToUse = getSelectedPrompt();
    if (!promptToUse) {
      setApiMessage(
        "Prompt not available. Please select a theme or enter a custom prompt."
      );
      setGenerationStep("error");
      return;
    }

    const imageToUse = getImageToUse();
    if (!imageToUse) {
      setApiMessage("Please upload an image to stylize.");
      setGenerationStep("error");
      return;
    }

    setApiMessage("Requesting generation quote...");
    setGenerationStep("quote_requested");

    quoteMutation.mutate({
      userId: unifiedUser.id,
      prompt: promptToUse,
      userPfpUrl: imageToUse,
    });
  };

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
      setApiMessage("Failed to download image. Please try again.");
    }
  };

  const isActionDisabled =
    quoteMutation.isPending ||
    paymentSubmissionMutation.isPending ||
    isSendingTx ||
    isConfirming ||
    generationStep === "payment_processing" ||
    !getSelectedPrompt() ||
    !hasAuth ||
    !getImageToUse();

  const hasValidImage = getImageToUse();
  const showWarnings = {
    noImage: !useUploadedImage && !unifiedUser?.profileImage && !uploadedImage,
    noUploadedImage: useUploadedImage && !uploadedImage,
  };

  if (isUserLoading) {
    return <div className="text-center py-10">Loading user data...</div>;
  }

  return (
    <div className="container mx-auto p-4 flex flex-col items-center space-y-6 max-w-lg">
      {/* Logo */}
      <div className="flex flex-col items-center space-y-4">
        <Image
          src="/splash.png"
          alt="Stylize Me Logo"
          width={80}
          height={80}
          className="object-contain"
        />
      </div>

      {/* Connection Interface */}
      <ConnectionInterface
        connectedAddress={connectedAddress}
        hasAuth={hasAuth}
      />

      {/* Main Interface - only show if user has authentication */}
      {hasAuth && unifiedUser && (
        <>
          {/* Image Selection */}
          <ImageSelector
            profileImageUrl={unifiedUser.profileImage}
            displayName={unifiedUser.displayName}
            username={unifiedUser.username}
            uploadedImage={uploadedImage}
            useUploadedImage={useUploadedImage}
            onImageUpload={handleImageUpload}
            onUseUploadedImageChange={setUseUploadedImage}
            onClearUploadedImage={handleClearUploadedImage}
            onError={setApiMessage}
          />

          {/* Theme Selection - only show if user has valid image */}
          {hasValidImage && (
            <ThemeSelector
              selectedThemeId={selectedThemeId}
              customPrompt={customPrompt}
              onThemeSelect={setSelectedThemeId}
              onCustomPromptChange={setCustomPrompt}
              getSelectedPrompt={getSelectedPrompt}
            />
          )}

          {/* Generate Button */}
          {hasValidImage &&
            generationStep !== "payment_processing" &&
            generationStep !== "payment_submitted" &&
            generationStep !== "job_queued" && (
              <Button
                onClick={handleRequestQuote}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg"
                disabled={isActionDisabled}
              >
                {quoteMutation.isPending
                  ? "Processing..."
                  : "Generate Character"}
              </Button>
            )}
        </>
      )}

      {/* Status Messages */}
      <StatusMessages
        apiMessage={apiMessage}
        generationStep={generationStep}
        currentTxHash={currentTxHash}
        isSendingTx={isSendingTx}
        isConfirming={isConfirming}
        showWarnings={showWarnings}
      />

      {/* Jobs Section */}
      {hasAuth && unifiedUser && (
        <JobsSection
          jobs={inProgressJobs}
          userProfileImage={unifiedUser.profileImage}
          uploadedImage={uploadedImage}
        />
      )}

      {/* Creations Gallery */}
      {hasAuth && unifiedUser && (
        <div className="w-full mt-10 pt-6 border-t">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Your Creations
          </h2>
          <CreationsGallery
            images={completedImages}
            isLoading={isLoadingImages}
            error={imagesError}
            onDownload={handleDownloadImage}
          />
        </div>
      )}

      {/* Frame Prompt Dialog - only for Farcaster users */}
      {pollingQuoteId && unifiedUser?.hasFarcaster && (
        <FramePromptDialog
          isOpen={showFramePromptDialog}
          onClose={() => setShowFramePromptDialog(false)}
        />
      )}
    </div>
  );
}
