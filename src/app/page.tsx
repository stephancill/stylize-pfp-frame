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
  const [paymentAddress, setPaymentAddress] = useState<string | null>(null);
  const [amountDue, setAmountDue] = useState<string | null>(null);
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
      setPaymentAddress(data.paymentAddress);
      setAmountDue(data.amountDue);
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
      setApiMessage(data.message || "Payment verified and job queued!");
      setGenerationStep("job_queued");
      // Reset state for next generation
      setQuoteId(null);
      setPaymentAddress(null);
      setAmountDue(null);
      setCurrentTxHash(undefined);
    },
    onError: (error) => {
      console.error("Error submitting payment:", error);
      setApiMessage(`Payment Submission Error: ${error.message}`);
      setGenerationStep("error");
      setIsPaymentSubmitted(false); // Allow retry on error
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
            {account.address && (
              <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Wallet: {account.address}
              </p>
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
        </>
      ) : (
        <p className="text-center py-10">
          No user data found. Please connect to Farcaster.
        </p>
      )}
    </div>
  );
}
