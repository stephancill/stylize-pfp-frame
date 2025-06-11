"use client";

import { truncateAddress } from "../lib/utils";

interface StatusMessagesProps {
  apiMessage: string | null;
  generationStep: string;
  currentTxHash?: `0x${string}`;
  isSendingTx: boolean;
  isConfirming: boolean;
  showWarnings?: {
    noImage?: boolean;
    noUploadedImage?: boolean;
  };
}

export function StatusMessages({
  apiMessage,
  generationStep,
  currentTxHash,
  isSendingTx,
  isConfirming,
  showWarnings,
}: StatusMessagesProps) {
  return (
    <div className="w-full space-y-4">
      {/* Warning Messages */}
      {showWarnings?.noUploadedImage && (
        <div className="p-3 border border-orange-300 rounded-md bg-orange-50 text-orange-700 text-sm">
          <p className="font-semibold">Upload Image</p>
          <p>Please upload an image to stylize.</p>
        </div>
      )}

      {/* API Messages */}
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
    </div>
  );
}
