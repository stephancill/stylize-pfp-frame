"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAccount, useSignMessage } from "wagmi";
import { createSiweMessage } from "viem/siwe";
import { base } from "wagmi/chains";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAuth } from "../lib/fetch-auth";
import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";
import sdk from "@farcaster/frame-sdk";
import { useMiniAppContext } from "@/providers/MiniAppContextProvider";

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

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  signInWithSiwe: () => Promise<AuthUser>;
  signInWithFarcaster: () => Promise<AuthUser>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<AuthResponse>;
  isWalletAuthenticated: boolean;
  getToken: () => string | null;
  userId: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

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

// Get user ID based on authentication type
const getUserId = (user: AuthUser | null): string | null => {
  if (!user) return null;
  if (user.authType === "siwe") {
    return user.address || null;
  } else if (user.authType === "farcaster") {
    return user.fid?.toString() || null;
  }
  return null;
};

// Fetch authentication status using fetchAuth helper
const fetchAuthStatus = async (): Promise<AuthResponse> => {
  const response = await fetchAuth("/api/auth/me");

  if (response.ok) {
    const authData: AuthResponse = await response.json();

    const userId = authData.user?.fid?.toString() || authData.user?.address;

    posthog.identify(userId);
    Sentry.setUser({
      id: userId,
    });

    return authData;
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
const farcasterSignIn = async () => {
  // 1. Get nonce from server
  const nonceResponse = await fetch("/api/auth/nonce");
  if (!nonceResponse.ok) {
    throw new Error("Failed to get authentication nonce");
  }
  const { nonce } = await nonceResponse.json();

  // 2. Use Farcaster SDK to sign in
  const result = await sdk.actions.signIn({
    nonce: nonce,
    acceptAuthAddress: true,
  });

  const signInResponse = await fetch("/api/auth/farcaster/signin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: result.message,
      signature: result.signature,
      challengeId: nonce,
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const queryClient = useQueryClient();
  const { context } = useMiniAppContext();

  // Ref to track if Farcaster sign in is in progress
  const farcasterSignInInProgress = useRef(false);

  // State to track if we've already attempted auto sign-in
  const [hasAttemptedAutoSignIn, setHasAttemptedAutoSignIn] = useState(false);

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
    mutationFn: farcasterSignIn,
    onSuccess: () => {
      farcasterSignInInProgress.current = false;
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
    onError: (error) => {
      farcasterSignInInProgress.current = false;
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
  const signInWithFarcaster = useCallback(async () => {
    // Prevent concurrent Farcaster sign in attempts
    if (farcasterSignInInProgress.current || farcasterSignInMut.isPending) {
      throw new Error("Farcaster sign in already in progress");
    }

    farcasterSignInInProgress.current = true;

    try {
      return await farcasterSignInMut.mutateAsync();
    } catch (error) {
      farcasterSignInInProgress.current = false;
      throw error;
    }
  }, [farcasterSignInMut]);

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

  // Auto-trigger SIWF when wallet connects in mini app and no user is authenticated
  useEffect(() => {
    if (
      context &&
      !authData?.authenticated &&
      !isLoading &&
      !farcasterSignInMut.isPending &&
      !farcasterSignInMut.isSuccess &&
      !farcasterSignInInProgress.current &&
      !hasAttemptedAutoSignIn
    ) {
      console.log("Triggering Farcaster sign in from AuthProvider", {
        context,
      });

      // Set both the ref and state to prevent multiple calls
      farcasterSignInInProgress.current = true;
      setHasAttemptedAutoSignIn(true);

      // Call the mutation immediately
      farcasterSignInMut.mutate();
    }
  }, [
    context,
    authData?.authenticated,
    isLoading,
    farcasterSignInMut.isPending,
    farcasterSignInMut.isSuccess,
    hasAttemptedAutoSignIn,
    farcasterSignInMut,
  ]);

  const contextValue: AuthContextType = {
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
    checkAuth: async () => {
      const result = await checkAuth();
      return result.data || { authenticated: false, user: null };
    },
    // Helper to check if the current wallet matches the authenticated SIWE user
    isWalletAuthenticated:
      !!address &&
      authData?.user?.authType === "siwe" &&
      authData?.user?.address?.toLowerCase() === address?.toLowerCase(),
    // Utility to get the current auth token
    getToken: getAuthToken,
    // Utility to get the current user ID
    userId: getUserId(authData?.user || null),
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context!;
}
