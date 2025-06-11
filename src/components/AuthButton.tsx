"use client";

import { useAuth } from "@/hooks/useAuth";

interface AuthButtonProps {
  onFarcasterSignIn?: (params: {
    message: string;
    signature: string;
    challengeId: string;
  }) => void;
  showFarcaster?: boolean;
  className?: string;
}

export function AuthButton({
  onFarcasterSignIn,
  showFarcaster = false,
  className = "",
}: AuthButtonProps) {
  const { isAuthenticated, user, isLoading, signInWithSiwe, signOut, error } =
    useAuth();

  const handleSiweSignIn = async () => {
    try {
      await signInWithSiwe();
    } catch (error) {
      console.error("SIWE sign in failed:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  if (isLoading) {
    return (
      <button
        disabled
        className={`px-4 py-2 rounded-md bg-gray-200 text-gray-500 cursor-not-allowed ${className}`}
      >
        Loading...
      </button>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <div className="text-sm text-gray-600">
          {user.authType === "siwe" ? (
            <span>
              Signed in with wallet: {user.address?.slice(0, 6)}...
              {user.address?.slice(-4)}
            </span>
          ) : (
            <span>Signed in with Farcaster FID: {user.fid}</span>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        onClick={handleSiweSignIn}
        className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
      >
        Sign In with Ethereum
      </button>

      {showFarcaster && (
        <div className="text-sm text-gray-600">
          <p>For Farcaster sign-in, use your Farcaster SDK integration</p>
          <p className="text-xs">
            Call signInWithFarcaster with message, signature, and challengeId
          </p>
        </div>
      )}

      {onFarcasterSignIn && (
        <div className="text-xs text-gray-500">
          Farcaster integration callback available
        </div>
      )}

      {error && <div className="text-sm text-red-500">Error: {error}</div>}
    </div>
  );
}
