"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface FarcasterAuthExampleProps {
  className?: string;
}

export function FarcasterAuthExample({
  className = "",
}: FarcasterAuthExampleProps) {
  const { isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleFarcasterSignIn = async () => {
    try {
      setError(null);

      // 1. Get challenge (nonce) from server
      const challengeResponse = await fetch("/api/auth/nonce");
      if (!challengeResponse.ok) {
        throw new Error("Failed to get challenge");
      }
      const { nonce: challengeId } = await challengeResponse.json();

      // 2. Use Farcaster SDK to sign in
      // Note: This assumes you have the Farcaster SDK available globally
      // You would typically import and initialize it properly in your app

      // Example SDK usage (replace with your actual SDK integration):
      /*
      const result = await sdk.actions.signIn({
        nonce: challengeId,
        acceptAuthAddress: true,
      });

      // 3. Submit the result to our authentication endpoint
      await signInWithFarcaster({
        message: result.message,
        signature: result.signature,
        challengeId,
      });
      */

      // For demo purposes, show the challenge ID
      alert(
        `Challenge generated: ${challengeId}\n\nNow you would use the Farcaster SDK to sign in with this challenge.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Farcaster sign-in failed");
    }
  };

  return (
    <div className={`flex flex-col gap-4 p-4 border rounded-lg ${className}`}>
      <h3 className="text-lg font-semibold">
        Farcaster Authentication Example
      </h3>

      <div className="text-sm text-gray-600">
        <p>To integrate Farcaster authentication:</p>
        <ol className="list-decimal list-inside space-y-1 mt-2">
          <li>
            Get a nonce from <code>/api/auth/nonce</code>
          </li>
          <li>
            Use <code>sdk.actions.signIn()</code> with the nonce
          </li>
          <li>
            Submit the result to <code>/api/auth/farcaster/signin</code>
          </li>
        </ol>
      </div>

      <button
        onClick={handleFarcasterSignIn}
        disabled={isLoading}
        className="px-4 py-2 rounded-md bg-purple-500 text-white hover:bg-purple-600 disabled:bg-gray-400 transition-colors"
      >
        {isLoading ? "Loading..." : "Test Farcaster Flow"}
      </button>

      {error && (
        <div className="text-sm text-red-500 p-2 bg-red-50 rounded">
          Error: {error}
        </div>
      )}

      <div className="text-xs text-gray-500 mt-4">
        <p>
          <strong>Code example:</strong>
        </p>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
          {`// Get nonce
const response = await fetch('/api/auth/nonce');
const { nonce } = await response.json();

// Use Farcaster SDK
const result = await sdk.actions.signIn({
  nonce: nonce,
  acceptAuthAddress: true,
});

// Authenticate
await signInWithFarcaster({
  message: result.message,
  signature: result.signature,
  challengeId: nonce,
});`}
        </pre>
      </div>
    </div>
  );
}
