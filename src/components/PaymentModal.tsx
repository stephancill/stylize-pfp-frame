"use client";

import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaBody,
  CredenzaClose,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza";
import { useIsMobile } from "@/hooks/use-mobile";
import { truncateAddress } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  Loader2,
  Wallet,
} from "lucide-react";
import { useEffect } from "react";
import { Hex, parseEther } from "viem";
import {
  useAccount,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from "wagmi";
import { base } from "wagmi/chains";

interface GenerationRequestPayload {
  userId: string;
  prompt: string;
  userPfpUrl?: string;
  referringImageId?: string;
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

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: string;
  imageUrl?: string;
  userId: string;
  referringImageId?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
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

export function PaymentModal({
  open,
  onOpenChange,
  prompt,
  imageUrl,
  userId,
  referringImageId,
  onSuccess,
  onError,
}: PaymentModalProps) {
  // Reset internal states when modal is closed
  useEffect(() => {
    if (!open) {
      // Reset any internal states when modal is closed
      // React Query will handle its own cache invalidation
    }
  }, [open]);
  const { address: connectedAddress } = useAccount();
  const account = useAccount();
  const { switchChainAsync } = useSwitchChain();

  // Quote query
  const {
    data: quoteData,
    isLoading: isLoadingQuote,
    error: quoteError,
    refetch: refetchQuote,
  } = useQuery<GenerationRequestResponse>({
    queryKey: ["quote", prompt, imageUrl, userId, referringImageId],
    queryFn: async () => {
      if (!prompt || !imageUrl) {
        throw new Error("Missing prompt or image");
      }
      return getGenerationQuoteAPI({
        userId,
        prompt,
        userPfpUrl: imageUrl,
        referringImageId,
      });
    },
    enabled: open && !!prompt && !!imageUrl && !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Transaction hooks
  const {
    data: sendTxData,
    error: sendTxError,
    isPending: isSendingTx,
    sendTransaction,
  } = useSendTransaction({
    mutation: {
      onError: (error) => {
        console.error("Error sending transaction:", error);
        onError?.(error);
      },
    },
  });

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmationError,
  } = useWaitForTransactionReceipt({
    hash: sendTxData,
    confirmations: 1,
  });

  // Payment submission mutation
  const paymentSubmissionMutation = useMutation<
    SubmitPaymentResponse,
    Error,
    SubmitPaymentPayload
  >({
    mutationFn: submitPaymentAPI,
    onSuccess: (data) => {
      console.log("Payment submission successful:", data);
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error submitting payment:", error);
      onError?.(error);
    },
  });

  // Handle transaction confirmation
  useEffect(() => {
    if (
      isConfirmed &&
      sendTxData &&
      !paymentSubmissionMutation.isPending &&
      !paymentSubmissionMutation.isSuccess &&
      quoteData
    ) {
      paymentSubmissionMutation.mutate({
        quoteId: quoteData.quoteId,
        transactionHash: sendTxData,
      });
    }
  }, [isConfirmed, sendTxData, paymentSubmissionMutation, quoteData]);

  // Handle chain switching
  useEffect(() => {
    const handleChainSwitch = async () => {
      if (connectedAddress && account.chainId !== base.id) {
        try {
          await switchChainAsync({ chainId: base.id });
        } catch (switchError: any) {
          console.error("Failed to switch network:", switchError);
          onError?.(switchError.message);
        }
      }
    };
    handleChainSwitch();
  }, [connectedAddress, account.chainId, switchChainAsync, onError]);

  // Handle payment initiation
  const handlePayment = async () => {
    if (!connectedAddress || !quoteData) return;

    try {
      const value = parseEther(quoteData.amountDue);
      const txData = quoteData.calldata;

      sendTransaction({
        to: quoteData.paymentAddress as `0x${string}`,
        value: value,
        data: txData,
        chainId: base.id,
      });
    } catch (e: any) {
      console.error("Transaction preparation error:", e);
      onError?.(e.message);
    }
  };

  // Determine button state and text
  const getButtonState = () => {
    if (paymentSubmissionMutation.isSuccess) {
      return {
        text: "Close",
        action: () => onOpenChange(false),
        disabled: false,
      };
    }

    if (paymentSubmissionMutation.isPending) {
      return { text: "Submitting...", action: () => {}, disabled: true };
    }

    if (isConfirming) {
      return { text: "Confirming...", action: () => {}, disabled: true };
    }

    if (isSendingTx) {
      return { text: "Sending...", action: () => {}, disabled: true };
    }

    if (isLoadingQuote) {
      return { text: "Loading...", action: () => {}, disabled: true };
    }

    if (quoteError) {
      return {
        text: "Try Again",
        action: () => refetchQuote(),
        disabled: false,
      };
    }

    if (!connectedAddress) {
      return { text: "Connect Wallet", action: () => {}, disabled: false };
    }

    if (quoteData) {
      return {
        text: `Pay`,
        action: handlePayment,
        disabled: false,
        icon: <CreditCard className="h-4 w-4" />,
      };
    }

    return { text: "Loading...", action: () => {}, disabled: true };
  };

  const buttonState = getButtonState();
  const isLoading =
    isLoadingQuote ||
    isSendingTx ||
    isConfirming ||
    paymentSubmissionMutation.isPending;

  // Determine title and icon
  const getTitle = () => {
    if (paymentSubmissionMutation.isSuccess) {
      return {
        text: "Generation Started",
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      };
    }
    if (quoteError || confirmationError) {
      return {
        text: "Error",
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      };
    }
    return { text: "Payment Required", icon: <Wallet className="h-5 w-5" /> };
  };

  const title = getTitle();

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className="sm:max-w-md">
        <CredenzaHeader>
          <CredenzaTitle className="flex items-center gap-2">
            {title.icon}
            {title.text}
          </CredenzaTitle>
          <CredenzaDescription>
            Complete payment to generate your image.
          </CredenzaDescription>
        </CredenzaHeader>

        <CredenzaBody>
          {/* Image and Prompt Preview */}
          <div className="mb-4 space-y-4">
            {/* Image Preview */}
            {imageUrl && (
              <div className="aspect-square w-24 mx-auto rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700">
                <img
                  src={imageUrl}
                  alt="Input image"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Prompt Preview */}
            {prompt && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Prompt:</p>
                <p className="text-sm text-foreground line-clamp-2">{prompt}</p>
              </div>
            )}
          </div>

          {/* Quote Display */}
          <div className="mb-4 p-4 bg-background/50 border border-border rounded-md">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Amount to pay:
              </p>
              {isLoadingQuote ? (
                <div className="h-8 bg-muted rounded animate-pulse" />
              ) : quoteData ? (
                <p className="text-2xl font-bold text-foreground">
                  {parseFloat(quoteData.amountDue).toFixed(4)} ETH
                </p>
              ) : (
                <p className="text-2xl font-bold text-destructive">
                  Error loading quote
                </p>
              )}
            </div>
          </div>

          {/* Status Messages */}
          {paymentSubmissionMutation.isSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                Payment successful! Your image is being generated.
              </p>
            </div>
          )}

          {sendTxData && (
            <div className="mb-4 p-3 bg-muted/50 border border-border rounded-md">
              <p className="text-sm text-muted-foreground">
                Transaction: {truncateAddress(sendTxData)}
              </p>
            </div>
          )}

          {(quoteError || confirmationError) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                {quoteError?.message || confirmationError?.message}
              </p>
            </div>
          )}
        </CredenzaBody>

        <CredenzaFooter className="sm:justify-end">
          {!paymentSubmissionMutation.isSuccess && (
            <CredenzaClose asChild>
              <Button
                variant="outline"
                disabled={isLoading}
                className="hidden sm:inline-flex"
              >
                Cancel
              </Button>
            </CredenzaClose>
          )}
          <Button
            onClick={buttonState.action}
            disabled={buttonState.disabled || isLoading}
            className={useIsMobile() ? "w-full" : ""}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {buttonState.icon && !isLoading && (
              <span className="mr-2">{buttonState.icon}</span>
            )}
            {buttonState.text}
          </Button>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  );
}
