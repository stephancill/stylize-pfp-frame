"use client";

import { useUser } from "../providers/UserContextProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  useSendTransaction,
  useAccount,
  useWaitForTransactionReceipt,
  useConnect,
  useSwitchChain,
} from "wagmi";
import { parseEther, toHex } from "viem";
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

interface GenerationRequestPayload {
  fid: number;
  prompt: string;
  userPfpUrl?: string;
}

interface GenerationRequestResponse {
  message: string;
  quoteId: string;
  paymentAddress: string;
  amountDue: string;
}

interface SubmitPaymentPayload {
  quoteId: string;
  transactionHash: string;
}

interface SubmitPaymentResponse {
  message: string;
  jobId?: string; // If job is queued immediately
}

// Define a type for the completed images we expect from the new API
interface CompletedImage {
  id: string;
  imageDataUrl: string | null;
  promptText: string | null;
  createdAt: string; // Or Date, depending on API response formatting
  quoteId: string;
}

// API function to get a quote
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
  const { user, isLoading: isUserLoading } = useUser();
  const { address: connectedAddress } = useAccount();
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const account = useAccount();

  // State for completed images
  const [completedImages, setCompletedImages] = useState<CompletedImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState<boolean>(false);
  const [imagesError, setImagesError] = useState<string | null>(null);

  const { switchChainAsync } = useSwitchChain();

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

  // State for payment flow
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
  // Add flag to prevent duplicate submissions
  const [isPaymentSubmitted, setIsPaymentSubmitted] = useState<boolean>(false);
  // State for polling
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollingQuoteId, setPollingQuoteId] = useState<string | null>(null);
  // State for Frame Prompt Dialog
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

  // Mutation for getting a quote
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
        const txData = toHex(data.quoteId);

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

  // Mutation for submitting payment proof
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
      setShowFramePromptDialog(true);

      setApiMessage(
        data.message ||
          "Payment verified! Waiting for image generation... (Add our frame for updates!)"
      );
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
    if (isUserLoading || !user) return;
    const defaultPrompt = `Stylized version of ${
      user.displayName || user.username || "my"
    } Farcaster PFP, cinematic lighting, high detail, epic, fantasy art`;
    setGeneratedPrompt(defaultPrompt);
  }, [user, isUserLoading]);

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

  // Effect to fetch completed images when user.fid is available
  useEffect(() => {
    const fetchCompletedImages = async () => {
      if (user && user.fid) {
        setIsLoadingImages(true);
        setImagesError(null);
        try {
          const response = await fetch(`/api/user/${user.fid}/images`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to fetch images");
          }
          const data = await response.json();
          setCompletedImages(data.images || []);
          if (data.images && data.images.length === 0) {
            // Optional: set a specific message if no images, or handle in render
          }
        } catch (error: any) {
          console.error("Error fetching completed images:", error);
          setImagesError(error.message);
        } finally {
          setIsLoadingImages(false);
        }
      }
    };

    fetchCompletedImages();
  }, [user, user?.fid]); // Depend on user object and fid specifically

  // Effect for polling for the newly generated image
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let pollTimeoutId: NodeJS.Timeout | null = null;

    const POLLING_INTERVAL = 5000; // 5 seconds
    const MAX_POLLING_DURATION = 120000; // 2 minutes

    const fetchAndCheck = async () => {
      if (!user?.fid || !pollingQuoteId) {
        setIsPolling(false);
        setGenerationStep("initial");
        return;
      }
      try {
        const response = await fetch(`/api/user/${user.fid}/images`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to fetch images during polling"
          );
        }
        const data = await response.json();
        const allImages: CompletedImage[] = data.images || [];
        setCompletedImages(allImages); // Update with the latest list

        const foundImage = allImages.find(
          (img) => img.quoteId === pollingQuoteId && img.imageDataUrl
        );

        if (foundImage) {
          setApiMessage("Your new character has been generated!");
          setIsPolling(false);
          setPollingQuoteId(null);
          setGenerationStep("initial");
        }
      } catch (error: any) {
        console.error("Polling error:", error);
        setApiMessage(
          `Error checking for new image: ${error.message}. Please refresh or try again.`
        );
        setIsPolling(false);
        setPollingQuoteId(null);
        setGenerationStep("initial");
      }
    };

    if (isPolling && pollingQuoteId && user?.fid) {
      // Initial check before starting interval
      fetchAndCheck();

      intervalId = setInterval(fetchAndCheck, POLLING_INTERVAL);

      pollTimeoutId = setTimeout(() => {
        if (isPolling) {
          // Check if still polling
          setApiMessage(
            "Image generation is taking longer than expected. It will appear in 'Your Creations' when ready. You can start a new generation."
          );
          setIsPolling(false);
          setPollingQuoteId(null);
          setGenerationStep("initial");
        }
      }, MAX_POLLING_DURATION);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (pollTimeoutId) clearTimeout(pollTimeoutId);
    };
  }, [isPolling, pollingQuoteId, user, user?.fid]); // Added user to dependencies for user.fid access

  const handleRequestQuote = () => {
    if (!user || !user.fid) {
      setApiMessage("User data not available.");
      setGenerationStep("error");
      return;
    }
    if (!generatedPrompt) {
      setApiMessage("Prompt not generated yet. Please wait a moment.");
      return;
    }
    setApiMessage("Requesting generation quote...");
    setGenerationStep("quote_requested");
    quoteMutation.mutate({
      fid: user.fid,
      prompt: generatedPrompt,
      userPfpUrl: user.pfpUrl,
    });
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
    !generatedPrompt;

  const YOUR_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://example.com"; // Replace with your actual app URL

  return (
    <div className="container mx-auto p-4 flex flex-col items-center space-y-6 max-w-lg">
      <h1 className="text-3xl font-bold text-center">AI Character Generator</h1>

      {user ? (
        <>
          <div className="flex flex-col items-center space-y-2">
            <Avatar className="w-24 h-24 border-2 border-purple-500">
              <AvatarImage
                src={user.pfpUrl}
                alt={user.displayName || user.username || "User avatar"}
              />
              <AvatarFallback className="text-2xl">
                {getInitials(user.displayName, user.username)}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-lg">
              {user.displayName || `@${user.username}`}
            </p>
            <p className="text-sm text-gray-500">FID: {user.fid}</p>
            {account.address ? (
              <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Wallet: {account.address}
              </p>
            ) : (
              connectors.map((connector) => {
                return (
                  <div>
                    <Button onClick={() => connect({ connector })}>
                      {connector.name}
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div className="w-full p-3 border rounded-md bg-gray-50 my-4">
            <h3 className="text-md font-semibold text-gray-700 mb-1">
              Generated Prompt:
            </h3>
            <p className="text-sm text-gray-600 italic">
              {generatedPrompt || "Generating prompt based on your profile..."}
            </p>
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
                  href={`https://etherscan.io/tx/${currentTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {currentTxHash}
                </a>
              </div>
            )}

          {/* Section to display completed images */}
          {user && user.fid && (
            <div className="w-full mt-10 pt-6 border-t">
              <h2 className="text-2xl font-semibold text-center mb-6">
                Your Creations
              </h2>
              {isLoadingImages && (
                <p className="text-center py-4">Loading your images...</p>
              )}
              {imagesError && (
                <p className="text-center text-red-500 py-4">
                  Error loading images: {imagesError}
                </p>
              )}
              {!isLoadingImages &&
                !imagesError &&
                completedImages.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    You haven't generated any characters yet.
                  </p>
                )}
              {!isLoadingImages &&
                !imagesError &&
                completedImages.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {completedImages.map((image) => (
                      <Card
                        key={image.id || image.quoteId}
                        className="overflow-hidden flex flex-col"
                      >
                        <CardContent className="p-0 aspect-square flex-grow">
                          {image.imageDataUrl ? (
                            <img
                              src={image.imageDataUrl}
                              alt={image.promptText || "Generated Character"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <p className="text-muted-foreground">
                                Image not available
                              </p>
                            </div>
                          )}
                        </CardContent>
                        {(image.promptText ||
                          image.createdAt ||
                          image.imageDataUrl) && (
                          <CardFooter className="p-3 flex flex-col items-start border-t">
                            {image.promptText && (
                              <p
                                className="text-xs text-muted-foreground truncate w-full"
                                title={image.promptText}
                              >
                                {image.promptText}
                              </p>
                            )}
                            {image.createdAt && (
                              <p className="text-xs text-muted-foreground/80 mt-1">
                                {new Date(image.createdAt).toLocaleDateString()}
                              </p>
                            )}
                            {image.imageDataUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 w-full"
                                onClick={() => {
                                  console.log("opening", image.imageDataUrl);
                                  sdk.actions.openUrl(image.imageDataUrl!);
                                }}
                              >
                                Open Image
                              </Button>
                            )}
                          </CardFooter>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
            </div>
          )}

          {/* Frame Prompt Dialog */}
          {pollingQuoteId && (
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
        </>
      ) : (
        <p className="text-center py-10">
          No user data found. Please connect to Farcaster.
        </p>
      )}
    </div>
  );
}
