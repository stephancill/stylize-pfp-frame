import { useCallback, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { createSiweMessage } from "viem/siwe";
import { base } from "wagmi/chains";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAuth } from "../lib/fetch-auth";

// Unified auth user interface
interface AuthUser {
  authType: "siwe" | "farcaster";
  // SIWE fields
  address?: string;
  chainId?: number;
  // Farcaster fields
  fid?: number;
}

interface AuthResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

const AUTH_QUERY_KEY = ["auth"];
const AUTH_TOKEN_KEY = "authToken";

// Utility functions for token management
const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

const setAuthToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
};

const removeAuthToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

// Fetch authentication status using fetchAuth helper
const fetchAuthStatus = async (): Promise<AuthResponse> => {
  const response = await fetchAuth("/api/auth/me");

  if (response.ok) {
    return await response.json();
  }

  // If unauthorized, clear the token
  if (response.status === 401) {
    removeAuthToken();
  }

  return { authenticated: false, user: null };
};

// SIWE sign in mutation
const siweSignInMutation = async ({
  address,
  signMessageAsync,
}: {
  address: string;
  signMessageAsync: (args: { message: string }) => Promise<string>;
}) => {
  // 1. Get nonce from server
  const nonceResponse = await fetch("/api/auth/nonce");
  if (!nonceResponse.ok) {
    throw new Error("Failed to get nonce");
  }
  const { nonce } = await nonceResponse.json();

  // 2. Create SIWE message with base.id as chain ID
  const messageString = createSiweMessage({
    domain: window.location.host,
    address: address as `0x${string}`,
    statement: "Sign in with Ethereum to the app.",
    uri: window.location.origin,
    version: "1",
    chainId: base.id,
    nonce,
    issuedAt: new Date(),
  });

  // 3. Sign the message with wallet
  const signature = await signMessageAsync({
    message: messageString,
  });

  // 4. Submit to server for verification
  const signInResponse = await fetch("/api/auth/signin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: messageString,
      signature,
    }),
  });

  if (!signInResponse.ok) {
    const errorData = await signInResponse.json();
    throw new Error(errorData.error || "Authentication failed");
  }

  const data = await signInResponse.json();

  // Store the token if provided
  if (data.token) {
    setAuthToken(data.token);
  }

  return data.user;
};

// Farcaster sign in mutation
const farcasterSignInMutation = async ({
  message,
  signature,
  challengeId,
}: {
  message: string;
  signature: string;
  challengeId: string;
}) => {
  const signInResponse = await fetch("/api/auth/farcaster/signin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      signature,
      challengeId,
    }),
  });

  if (!signInResponse.ok) {
    const errorData = await signInResponse.json();
    throw new Error(errorData.error || "Farcaster authentication failed");
  }

  const data = await signInResponse.json();

  // Store the token in localStorage
  if (data.token) {
    setAuthToken(data.token);
  }

  return data.user;
};

// Sign out mutation using fetchAuth helper
const signOutMutation = async () => {
  const response = await fetchAuth("/api/auth/signout", {
    method: "POST",
  });

  // Clear the token regardless of response status
  removeAuthToken();

  if (!response.ok) {
    throw new Error("Failed to sign out");
  }
};

export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const queryClient = useQueryClient();

  // Query for authentication status
  const {
    data: authData,
    isLoading,
    error,
    refetch: checkAuth,
  } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchAuthStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // SIWE sign in mutation
  const siweSignInMut = useMutation({
    mutationFn: siweSignInMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
    onError: (error) => {
      console.error("SIWE sign in error:", error);
    },
  });

  // Farcaster sign in mutation
  const farcasterSignInMut = useMutation({
    mutationFn: farcasterSignInMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
    onError: (error) => {
      console.error("Farcaster sign in error:", error);
    },
  });

  // Sign out mutation
  const signOutMut = useMutation({
    mutationFn: signOutMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
    onError: (error) => {
      console.error("Sign out error:", error);
    },
  });

  // SIWE sign in handler
  const signInWithSiwe = useCallback(async () => {
    if (!address || !isConnected) {
      throw new Error("Wallet not connected");
    }

    return siweSignInMut.mutateAsync({
      address,
      signMessageAsync,
    });
  }, [address, isConnected, signMessageAsync, siweSignInMut]);

  // Farcaster sign in handler
  const signInWithFarcaster = useCallback(
    async (params: {
      message: string;
      signature: string;
      challengeId: string;
    }) => {
      return farcasterSignInMut.mutateAsync(params);
    },
    [farcasterSignInMut]
  );

  // Sign out handler
  const signOut = useCallback(async () => {
    return signOutMut.mutateAsync();
  }, [signOutMut]);

  // Effect to clear auth when wallet disconnects (only for SIWE users)
  useEffect(() => {
    if (
      !isConnected &&
      authData?.authenticated &&
      authData.user?.authType === "siwe"
    ) {
      console.log("Wallet disconnected for SIWE user, clearing auth state");
      removeAuthToken();
      queryClient.setQueryData(AUTH_QUERY_KEY, {
        authenticated: false,
        user: null,
      });
    }
  }, [
    isConnected,
    authData?.authenticated,
    authData?.user?.authType,
    queryClient,
  ]);

  return {
    isAuthenticated: authData?.authenticated || false,
    user: authData?.user || null,
    isLoading:
      isLoading ||
      siweSignInMut.isPending ||
      farcasterSignInMut.isPending ||
      signOutMut.isPending,
    error:
      error?.message ||
      siweSignInMut.error?.message ||
      farcasterSignInMut.error?.message ||
      signOutMut.error?.message ||
      null,
    signInWithSiwe,
    signInWithFarcaster,
    signOut,
    checkAuth,
    // Helper to check if the current wallet matches the authenticated SIWE user
    isWalletAuthenticated:
      address &&
      authData?.user?.authType === "siwe" &&
      authData?.user?.address?.toLowerCase() === address?.toLowerCase(),
    // Utility to get the current auth token
    getToken: getAuthToken,
  };
}
