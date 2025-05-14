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
} from "wagmi";
import { parseEther, toHex } from "viem";

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
  const { user, isLoading: isUserLoading } = useUser();
  const { address: connectedAddress } = useAccount();
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");

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
  });

  // Mutation for getting a quote
  const quoteMutation = useMutation<
    GenerationRequestResponse,
    Error,
    GenerationRequestPayload
  >({
    mutationFn: getGenerationQuoteAPI,
    onSuccess: (data) => {
      console.log("Quote received:", data);
      setQuoteId(data.quoteId);
      setPaymentAddress(data.paymentAddress);
      setAmountDue(data.amountDue);
      setApiMessage(data.message);
      setGenerationStep("awaiting_payment");
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
      // Reset quote details after successful submission
      setQuoteId(null);
      setPaymentAddress(null);
      setAmountDue(null);
      setCurrentTxHash(undefined);
    },
    onError: (error) => {
      console.error("Error submitting payment:", error);
      setApiMessage(`Payment Submission Error: ${error.message}`);
      setGenerationStep("error"); // Or back to "awaiting_payment" to allow retry?
    },
  });

  useEffect(() => {
    if (isUserLoading || !user) return;
    // Set the generated prompt once user data is available
    const defaultPrompt = `Stylized version of ${
      user.displayName || user.username || "my"
    } Farcaster PFP, cinematic lighting, high detail, epic, fantasy art`;
    setGeneratedPrompt(defaultPrompt);
    console.log("Generated prompt for user:", defaultPrompt);
  }, [user, isUserLoading]);

  useEffect(() => {
    if (isConfirmed && currentTxHash && quoteId) {
      setApiMessage(
        `Transaction confirmed! Hash: ${currentTxHash}. Submitting for verification...`
      );
      paymentSubmissionMutation.mutate({
        quoteId,
        transactionHash: currentTxHash,
      });
      setGenerationStep("payment_submitted");
    }
  }, [isConfirmed, currentTxHash, quoteId, paymentSubmissionMutation]);

  useEffect(() => {
    if (sendTxData) {
      setCurrentTxHash(sendTxData);
      setApiMessage(
        `Transaction submitted! Waiting for confirmation... Hash: ${sendTxData}`
      );
      setGenerationStep("payment_processing");
    }
  }, [sendTxData]);

  useEffect(() => {
    if (sendTxError) {
      setApiMessage(`Transaction Error: ${sendTxError.message}`);
      setGenerationStep("awaiting_payment");
    }
    if (confirmationError) {
      setApiMessage(`Confirmation Error: ${confirmationError.message}`);
      setGenerationStep("awaiting_payment");
    }
  }, [sendTxError, confirmationError]);

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

  const handlePayAndGenerate = async () => {
    if (!paymentAddress || !amountDue || !quoteId || !connectedAddress) {
      setApiMessage("Payment details not available or wallet not connected.");
      setGenerationStep("error");
      return;
    }

    setApiMessage("Preparing transaction...");
    try {
      const value = parseEther(amountDue); // Assumes amountDue is in ETH
      const data = toHex(quoteId); // Encode quoteId as hex data

      sendTransaction({
        to: paymentAddress as `0x${string}`,
        value: value,
        data: data,
      });
      // The useEffect for sendTxData will handle next steps
    } catch (e: any) {
      console.error("Transaction preparation error:", e);
      setApiMessage(`Error: ${e.message}`);
      setGenerationStep("awaiting_payment"); // Revert to allow retry
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
          </div>

          <div className="w-full p-3 border rounded-md bg-gray-50 my-4">
            <h3 className="text-md font-semibold text-gray-700 mb-1">
              Generated Prompt:
            </h3>
            <p className="text-sm text-gray-600 italic">
              {generatedPrompt || "Generating prompt based on your profile..."}
            </p>
          </div>

          {generationStep !== "awaiting_payment" &&
            generationStep !== "payment_processing" &&
            generationStep !== "payment_submitted" &&
            generationStep !== "job_queued" && (
              <Button
                onClick={handleRequestQuote}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg"
                disabled={isActionDisabled}
              >
                {quoteMutation.isPending
                  ? "Getting Quote..."
                  : "1. Get Generation Quote"}
              </Button>
            )}

          {generationStep === "awaiting_payment" &&
            paymentAddress &&
            amountDue &&
            quoteId && (
              <div className="w-full p-4 border rounded-md bg-yellow-50 space-y-3 text-center">
                <h2 className="text-xl font-semibold">Payment Required</h2>
                <p>To generate your image, please send:</p>
                <p>
                  <strong className="text-lg">{amountDue} ETH</strong>
                </p>
                <p>
                  To address:{" "}
                  <code className="text-sm bg-gray-200 p-1 rounded">
                    {paymentAddress}
                  </code>
                </p>
                <p>
                  You <strong className="text-red-500">MUST</strong> include the
                  following in the transaction's data/hex data field:
                </p>
                <p>
                  <code className="text-sm bg-gray-200 p-1 rounded">
                    {quoteId}
                  </code>
                </p>
                <p className="text-xs text-gray-500">
                  This Quote ID links your payment to your request.
                </p>

                {!connectedAddress && (
                  <p className="text-red-500 font-semibold">
                    Please connect your wallet to pay.
                  </p>
                )}
                <Button
                  onClick={handlePayAndGenerate}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
                  disabled={isActionDisabled || !connectedAddress}
                >
                  {isSendingTx
                    ? "Processing Tx..."
                    : isConfirming
                    ? "Confirming Tx..."
                    : "2. Pay with Wallet"}
                </Button>
              </div>
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
