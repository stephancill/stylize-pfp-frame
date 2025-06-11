"use client";

import { useUser } from "../providers/UserContextProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import {
  useSendTransaction,
  useAccount,
  useWaitForTransactionReceipt,
  useConnect,
  useSwitchChain,
  useDisconnect,
} from "wagmi";
import { Hex, parseEther, toHex } from "viem";
import { base } from "wagmi/chains";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import sdk from "@farcaster/frame-sdk";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Share2, Upload, X, Download } from "lucide-react";
import Image from "next/image";
import type { GeneratedImageStatus } from "@/types/db";
import { CreationsGallery } from "@/components/CreationsGallery";

const truncateAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// --- Prompt Generation Logic ---
interface Theme {
  id: string;
  name: string;
  prompt: string;
}

const themes: Theme[] = [
  {
    id: "higherBuddy",
    name: "Higher Buddy",
    prompt: `come up with an animal or creature (not too obscure) that is representative of the character or vibe of the image.

then generate a profile picture of the animal. include as many defining characteristics as possible. if the character is wearing clothes, try to match it as closely as possible - otherwise give the character a minimalist outfit.

image characteristics: high grain effect, 90s disposable camera style with chromatic aberration, slight yellow tint, and hyper-realistic photography with detailed elements, captured in harsh flash photography style, vintage paparazzi feel. preserve the prominent colors in the original image`,
  },
  {
    id: "cinematicFantasy",
    name: "Cinematic Fantasy",
    prompt: `Transform the provided profile picture into a mythical or fantasy version.

Key elements for the transformation:
1. Subject Adaptation: Reimagine the animal/creature in the image as a mythical or fantasy version.
2. Attire/Features: Adorn the subject with fantasy-themed attire or features (e.g., mystical armor, glowing runes, ethereal wings) suitable for its form.
3. Atmosphere: Create a dramatic and cinematic atmosphere with dynamic lighting (e.g., god rays, magical glows, contrasting shadows) and a rich, detailed background suggesting an epic fantasy world.
4. Artistic Style: The final image should look like a piece of high-detail digital fantasy art, emphasizing realism within the fantasy context.

Ensure the result is a captivating, profile picture-worthy artwork.`,
  },
  {
    id: "studioGhibli",
    name: "Studio Ghibli",
    prompt: `Reimagine the provided image in the iconic Studio Ghibli style.`,
  },
];
// --- End Prompt Generation Logic ---

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

// API function to submit payment proof (txHash)
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
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { user, isLoading: isUserLoading } = useUser();
  const { address: connectedAddress } = useAccount();
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [selectedThemeId, setSelectedThemeId] = useState<string>(themes[0].id);
  const account = useAccount();

  // State for custom prompt
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [showCustomPromptDialog, setShowCustomPromptDialog] =
    useState<boolean>(false);

  // State for image upload
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [useUploadedImage, setUseUploadedImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // React Query is provided in the layout

  // Determine current user identifier for API calls
  const currentUserId = user?.fid ? user.fid.toString() : connectedAddress;

  // Query for completed images
  const {
    data: completedImages = [],
    isLoading: isLoadingImages,
    error: imagesError,
    refetch: refetchImages,
  } = useQuery<CompletedImage[]>({
    queryKey: ["completedImages", currentUserId],
    queryFn: async () => {
      const response = await fetch(`/api/user/${currentUserId}/images`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch images");
      }
      const data = await response.json();
      return data.images || [];
    },
    enabled: !!currentUserId,
  });

  const { data: inProgressJobs = [], refetch: refetchJobs } = useQuery<
    InProgressJob[]
  >({
    queryKey: ["inProgressJobs", currentUserId],
    queryFn: async () => {
      const response = await fetch(`/api/user/${currentUserId}/jobs`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch jobs");
      }
      const data = await response.json();
      return data.jobs || [];
    },
    enabled: !!currentUserId,
  });

  const { switchChainAsync } = useSwitchChain();

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
  const [showFramePromptDialog, setShowFramePromptDialog] =
    useState<boolean>(false);

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

      if (user?.fid) {
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
      setIsPaymentSubmitted(false); // Reset flag if submission fails
    },
  });

  useEffect(() => {
    if (isUserLoading) return;
    if (!user && !connectedAddress) return;

    const selectedTheme =
      themes.find((t) => t.id === selectedThemeId) || themes[0];
    setGeneratedPrompt(selectedTheme.prompt);
  }, [user, isUserLoading, selectedThemeId, connectedAddress]);

  // Consolidate transaction confirmation handling into a single effect
  useEffect(() => {
    const handleTransactionConfirmation = async () => {
      if (isConfirmed && currentTxHash && !isPaymentSubmitted) {
        setIsPaymentSubmitted(true); // Prevent duplicate submissions
        setApiMessage(
          `Transaction ${currentTxHash} confirmed on-chain. Submitting to backend for processing...`
        );
        setGenerationStep("payment_submitted");

        try {
          await paymentSubmissionMutation.mutateAsync({
            quoteId: quoteId!,
            transactionHash: currentTxHash,
          });
        } catch (error) {
          // Error handling is already done in the mutation's onError
          setIsPaymentSubmitted(false); // Reset flag if submission fails
        }
      }
    };

    handleTransactionConfirmation();
  }, [isConfirmed, currentTxHash, isPaymentSubmitted]);

  useEffect(() => {
    if (sendTxData) {
      setCurrentTxHash(sendTxData);
      setApiMessage(
        `Transaction ${sendTxData} submitted to network. Waiting for on-chain confirmation...`
      );
    }
  }, [sendTxData]);

  useEffect(() => {
    if (sendTxError) {
      setApiMessage(`Transaction Error: ${sendTxError.message}`);
      setGenerationStep("awaiting_payment");
      setIsPaymentSubmitted(false); // Reset flag on error
    }
    if (confirmationError) {
      setApiMessage(`Confirmation Error: ${confirmationError.message}`);
      setGenerationStep("awaiting_payment");
      setIsPaymentSubmitted(false); // Reset flag on error
    }
  }, [sendTxError, confirmationError]);

  // Reset payment submitted flag when starting a new quote request
  useEffect(() => {
    if (generationStep === "quote_requested") {
      setIsPaymentSubmitted(false);
    }
  }, [generationStep]);

  // Check if user has any valid authentication
  const hasValidAuth = user?.fid || connectedAddress;

  // Check if user has a valid image to use
  const hasValidImage = uploadedImage || user?.pfpUrl;

  // Query for polling generated image status
  const {
    data: polledImage,
    isError: isPollingError,
    error: pollingError,
  } = useQuery<CompletedImage | null, Error>({
    queryKey: ["polledImage", pollingQuoteId],
    queryFn: async () => {
      if (!currentUserId || !pollingQuoteId) {
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
    enabled: isPolling && !!pollingQuoteId && !!currentUserId,
    refetchInterval: (data) => {
      if (data) return false;
      return 5000;
    },
    retry: false,
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

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

    if (isPolling && pollingQuoteId && currentUserId) {
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
  }, [isPolling, pollingQuoteId, currentUserId]);

  // Add effect to handle chain switching when address changes
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setApiMessage("Image file size must be less than 5MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      setApiMessage("Please select a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedImage(dataUrl);
      setUseUploadedImage(true);
      setApiMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRequestQuote = () => {
    // Determine userId - either FID or wallet address
    let userId: string;
    if (user && user.fid) {
      userId = user.fid.toString();
    } else if (connectedAddress) {
      userId = connectedAddress;
    } else {
      setApiMessage(
        "Please connect your wallet or sign in with Farcaster to continue."
      );
      setGenerationStep("error");
      return;
    }

    if (!generatedPrompt) {
      setApiMessage("Prompt not generated yet. Please wait a moment.");
      return;
    }

    // Determine which image to use
    const imageToUse =
      useUploadedImage && uploadedImage ? uploadedImage : user?.pfpUrl;

    if (!imageToUse) {
      setApiMessage("Please upload an image to stylize.");
      return;
    }

    setApiMessage("Requesting generation quote...");
    setGenerationStep("quote_requested");
    const promptToUse = customPrompt || generatedPrompt;
    if (!promptToUse) {
      setApiMessage(
        "Prompt not available. Please select a theme or enter a custom prompt."
      );
      return;
    }
    quoteMutation.mutate({
      userId: userId,
      prompt: promptToUse,
      userPfpUrl: imageToUse,
    });
  };

  const handleDownloadImage = (imageDataUrl: string, imageId: string) => {
    try {
      // Create a temporary anchor element for download
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

  if (isUserLoading)
    return <div className="text-center py-10">Loading user data...</div>;

  const getInitials = (
    displayName: string | undefined,
    username: string | undefined
  ) => {
    const nameToUse = displayName || username;
    if (!nameToUse) return "??";
    const names = nameToUse.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return nameToUse.substring(0, 2).toUpperCase();
  };

  const isActionDisabled =
    quoteMutation.isPending ||
    paymentSubmissionMutation.isPending ||
    isSendingTx ||
    isConfirming ||
    generationStep === "payment_processing" ||
    !generatedPrompt ||
    !hasValidAuth ||
    !hasValidImage;

  return (
    <div className="container mx-auto p-4 flex flex-col items-center space-y-6 max-w-lg">
      <div className="flex flex-col items-center space-y-4">
        <Image
          src="/splash.png"
          alt="Stylize Me Logo"
          width={80}
          height={80}
          className="object-contain"
        />
      </div>

      {user ? (
        <>
          <div className="flex flex-col items-center space-y-2">
            {account.address ? (
              <div className="flex items-center space-x-2">
                <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Wallet: {truncateAddress(account.address)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => disconnect()}
                  className="h-6 w-6 p-0 hover:bg-red-100"
                >
                  <X className="h-3 w-3 text-gray-500 hover:text-red-500" />
                </Button>
              </div>
            ) : (
              connectors.map((connector) => {
                return (
                  <div key={connector.id}>
                    <Button onClick={() => connect({ connector })}>
                      {connector.name}
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          {/* Image Selection Section */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose Image to Stylize:
            </label>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Profile Picture Option - only show if user has pfpUrl */}
              {user.pfpUrl && (
                <Card
                  className={`cursor-pointer transition-all ${
                    !useUploadedImage
                      ? "ring-2 ring-purple-500 bg-purple-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => setUseUploadedImage(false)}
                >
                  <CardContent className="p-4 text-center">
                    <Avatar className="w-16 h-16 mx-auto mb-2">
                      <AvatarImage src={user.pfpUrl} alt="Profile" />
                      <AvatarFallback>
                        {getInitials(user.displayName, user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium">Use Profile Picture</p>
                  </CardContent>
                </Card>
              )}

              {/* Upload Option */}
              <Card
                className={`cursor-pointer transition-all ${
                  useUploadedImage || !user.pfpUrl
                    ? "ring-2 ring-purple-500 bg-purple-50"
                    : "hover:bg-gray-50"
                } ${!user.pfpUrl ? "col-span-2" : ""}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <CardContent className="p-4 text-center">
                  {uploadedImage ? (
                    <div className="relative">
                      <img
                        src={uploadedImage}
                        alt="Uploaded"
                        className="w-16 h-16 mx-auto mb-2 rounded-full object-cover"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedImage(null);
                          setUseUploadedImage(false);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 mx-auto mb-2 bg-gray-200 rounded-full flex items-center justify-center">
                      <Upload className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <p className="text-sm font-medium">
                    {uploadedImage ? "Change Image" : "Upload Image"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {useUploadedImage && uploadedImage && (
              <div className="p-3 mb-4 border border-green-300 rounded-md bg-green-50 text-green-700 text-sm">
                <p className="font-semibold">Using Uploaded Image</p>
                <p>Your custom image will be used for stylization</p>
              </div>
            )}

            {!useUploadedImage && user.pfpUrl && (
              <div className="p-3 mb-4 border border-blue-300 rounded-md bg-blue-50 text-blue-700 text-sm">
                <p className="font-semibold">Using Profile Picture</p>
                <p>
                  Your Farcaster profile picture will be used for stylization
                </p>
              </div>
            )}
          </div>

          {/* Theme Selector Buttons */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Theme or Enter Custom Prompt:
            </label>
            <div className="flex space-x-2 mb-4">
              {themes.map((theme) => (
                <Button
                  key={theme.id}
                  variant={selectedThemeId === theme.id ? "default" : "outline"} // Highlight active theme
                  onClick={() => setSelectedThemeId(theme.id)}
                  className="flex-grow"
                >
                  {theme.name}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowCustomPromptDialog(true)}
              className="w-full mb-4"
            >
              Enter Custom Prompt
            </Button>
            {customPrompt && (
              <div className="p-2 mb-4 border border-blue-300 rounded-md bg-blue-50 text-blue-700 text-sm">
                <p className="font-semibold">Using Custom Prompt:</p>
                <p className="truncate">{customPrompt}</p>
              </div>
            )}
          </div>

          {/* Warning if no image selected */}
          {!useUploadedImage && !user.pfpUrl && !uploadedImage && (
            <div className="w-full p-3 my-4 border border-orange-300 rounded-md bg-orange-50 text-orange-700 text-sm">
              <p className="font-semibold">Image Required</p>
              <p>Please upload an image to generate a character.</p>
            </div>
          )}

          {useUploadedImage && !uploadedImage && (
            <div className="w-full p-3 my-4 border border-orange-300 rounded-md bg-orange-50 text-orange-700 text-sm">
              <p className="font-semibold">Upload Image</p>
              <p>Please upload an image to stylize.</p>
            </div>
          )}

          {generationStep !== "payment_processing" &&
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

          {apiMessage && (
            <div
              className={`p-3 rounded-md text-sm ${
                generationStep === "error"
                  ? "bg-red-100 text-red-700"
                  : generationStep === "job_queued"
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {apiMessage}
            </div>
          )}
          {(isSendingTx ||
            isConfirming ||
            generationStep === "payment_processing" ||
            generationStep === "payment_submitted") &&
            currentTxHash && (
              <div className="text-sm text-gray-600">
                Transaction Hash:{" "}
                <a
                  href={`https://basescan.org/tx/${currentTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {truncateAddress(currentTxHash)}
                </a>
              </div>
            )}

          {/* Section to display completed images */}
          {user && user.fid && (
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
          {pollingQuoteId && user?.fid && (
            <Dialog
              open={showFramePromptDialog}
              onOpenChange={setShowFramePromptDialog}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Get Notified via Farcaster Frame</DialogTitle>
                  <DialogDescription>
                    Add our Farcaster frame to your feed to get notified when
                    your character is ready!
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-start mt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      sdk.actions.addFrame();
                      setShowFramePromptDialog(false);
                    }}
                  >
                    Add Frame to Farcaster
                  </Button>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Dismiss
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Custom Prompt Dialog */}
          <Dialog
            open={showCustomPromptDialog}
            onOpenChange={setShowCustomPromptDialog}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Enter Custom Prompt</DialogTitle>
                <DialogDescription>
                  Type your desired prompt below. This will override the
                  selected theme.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  id="customPromptInput"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., A cat wearing a wizard hat"
                  className="w-full"
                />
              </div>
              <DialogFooter className="sm:justify-end">
                <Button
                  type="button"
                  onClick={() => {
                    // Optionally, you could validate the prompt here
                    setShowCustomPromptDialog(false);
                  }}
                >
                  Save Prompt
                </Button>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // If canceling, consider whether to clear customPrompt or not
                      // setCustomPrompt(""); // Uncomment to clear on cancel
                      setShowCustomPromptDialog(false);
                    }}
                  >
                    Cancel
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : !user && connectedAddress ? (
        <>
          {/* Wallet-only user interface */}
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center space-x-2">
              <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Wallet: {truncateAddress(connectedAddress)}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => disconnect()}
                className="h-6 w-6 p-0 hover:bg-red-100"
              >
                <X className="h-3 w-3 text-gray-500 hover:text-red-500" />
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Wallet connected - you can generate characters by uploading images
            </p>
          </div>

          {/* Image Selection Section - Upload only for wallet users */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Upload Image to Stylize:
            </label>

            <Card
              className={`cursor-pointer transition-all ${
                uploadedImage
                  ? "ring-2 ring-purple-500 bg-purple-50"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="p-6 text-center">
                {uploadedImage ? (
                  <div className="relative inline-block">
                    <img
                      src={uploadedImage}
                      alt="Uploaded"
                      className="w-20 h-20 mx-auto mb-3 rounded-full object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedImage(null);
                        setUseUploadedImage(false);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-20 h-20 mx-auto mb-3 bg-gray-200 rounded-full flex items-center justify-center">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <p className="text-lg font-medium">
                  {uploadedImage ? "Change Image" : "Upload Your Image"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Click to select an image to stylize
                </p>
              </CardContent>
            </Card>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {uploadedImage && (
              <div className="p-3 mt-4 border border-green-300 rounded-md bg-green-50 text-green-700 text-sm">
                <p className="font-semibold">Image Ready</p>
                <p>Your uploaded image will be used for stylization</p>
              </div>
            )}
          </div>

          {/* Theme Selector for wallet users */}
          {uploadedImage && (
            <>
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Theme or Enter Custom Prompt:
                </label>
                <div className="flex space-x-2 mb-4">
                  {themes.map((theme) => (
                    <Button
                      key={theme.id}
                      variant={
                        selectedThemeId === theme.id ? "default" : "outline"
                      }
                      onClick={() => setSelectedThemeId(theme.id)}
                      className="flex-grow"
                    >
                      {theme.name}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowCustomPromptDialog(true)}
                  className="w-full mb-4"
                >
                  Enter Custom Prompt
                </Button>
                {customPrompt && (
                  <div className="p-2 mb-4 border border-blue-300 rounded-md bg-blue-50 text-blue-700 text-sm">
                    <p className="font-semibold">Using Custom Prompt:</p>
                    <p className="truncate">{customPrompt}</p>
                  </div>
                )}
              </div>

              {generationStep !== "payment_processing" &&
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
        </>
      ) : (
        <>
          {/* No user and no wallet - show connection options */}
          <div className="text-center space-y-4">
            <p className="text-lg text-gray-700 mb-4">
              Connect your wallet to start generating characters
            </p>
            <div className="space-y-2">
              {connectors.map((connector) => (
                <Button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  className="w-full"
                >
                  Connect with {connector.name}
                </Button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              You can also sign in with Farcaster for additional features
            </p>
          </div>
        </>
      )}

      {/* API Messages and Transaction Status - show for all users */}
      {apiMessage && (
        <div
          className={`p-3 rounded-md text-sm ${
            generationStep === "error"
              ? "bg-red-100 text-red-700"
              : generationStep === "job_queued"
              ? "bg-green-100 text-green-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {apiMessage}
        </div>
      )}

      {(isSendingTx ||
        isConfirming ||
        generationStep === "payment_processing" ||
        generationStep === "payment_submitted") &&
        currentTxHash && (
          <div className="text-sm text-gray-600">
            Transaction Hash:{" "}
            <a
              href={`https://basescan.org/tx/${currentTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {truncateAddress(currentTxHash)}
            </a>
          </div>
        )}

      {/* Section to display in-progress jobs - show for any authenticated user */}
      {currentUserId && inProgressJobs.length > 0 && (
        <div className="w-full mt-10 pt-6 border-t">
          <h2 className="text-2xl font-semibold text-center mb-6">
            In-Progress Jobs
          </h2>
          <div className="space-y-4">
            {inProgressJobs.map((job) => {
              // Find if the prompt matches any theme
              const matchingTheme = themes.find((theme) =>
                job.promptText?.includes(theme.prompt)
              );

              return (
                <div key={job.id} className="border rounded-md p-4">
                  <div className="flex gap-4">
                    {/* Input Image Preview */}
                    <div className="w-24 h-24 flex-shrink-0">
                      <img
                        src={
                          user?.pfpUrl || uploadedImage || "/placeholder.png"
                        }
                        alt="Input"
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>

                    {/* Job Details */}
                    <div className="flex-grow">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">
                          {matchingTheme ? matchingTheme.name : "Custom Prompt"}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            job.status === "generating"
                              ? "bg-blue-100 text-blue-700"
                              : job.status === "queued"
                              ? "bg-yellow-100 text-yellow-700"
                              : job.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {job.status.replace("_", " ")}
                        </span>
                      </div>

                      {/* Show full prompt if custom, otherwise just theme name */}
                      {!matchingTheme && job.promptText && (
                        <p className="text-sm text-gray-600 mb-2">
                          {job.promptText}
                        </p>
                      )}

                      {job.transactionHash && (
                        <p className="text-xs text-gray-500">
                          Tx:{" "}
                          <a
                            href={`https://basescan.org/tx/${job.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {truncateAddress(job.transactionHash)}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section to display completed images - show for any authenticated user */}
      {currentUserId && (
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
      {pollingQuoteId && user?.fid && (
        <Dialog
          open={showFramePromptDialog}
          onOpenChange={setShowFramePromptDialog}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Get Notified via Farcaster Frame</DialogTitle>
              <DialogDescription>
                Add our Farcaster frame to your feed to get notified when your
                character is ready!
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-start mt-4">
              <Button
                type="button"
                onClick={() => {
                  sdk.actions.addFrame();
                  setShowFramePromptDialog(false);
                }}
              >
                Add Frame to Farcaster
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Dismiss
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Custom Prompt Dialog */}
      <Dialog
        open={showCustomPromptDialog}
        onOpenChange={setShowCustomPromptDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Custom Prompt</DialogTitle>
            <DialogDescription>
              Type your desired prompt below. This will override the selected
              theme.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              id="customPromptInput"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., A cat wearing a wizard hat"
              className="w-full"
            />
          </div>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              onClick={() => {
                // Optionally, you could validate the prompt here
                setShowCustomPromptDialog(false);
              }}
            >
              Save Prompt
            </Button>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // If canceling, consider whether to clear customPrompt or not
                  // setCustomPrompt(""); // Uncomment to clear on cancel
                  setShowCustomPromptDialog(false);
                }}
              >
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
