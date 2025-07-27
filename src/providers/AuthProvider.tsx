"use client";

import { useMiniAppContext } from "@/providers/MiniAppContextProvider";
import sdk from "@farcaster/frame-sdk";
import * as Sentry from "@sentry/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import posthog from "posthog-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAccount, useDisconnect } from "wagmi";
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

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  signInWithSiwe: (args: {
    message: string;
    signature: string;
    address: string;
    nonce: string;
  }) => Promise<AuthUser>;
  signInWithFarcaster: () => Promise<AuthUser>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<AuthResponse>;
  isWalletAuthenticated: boolean;
  getToken: () => string | null;
  userId: string | null;
  nonce: string | null;
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

async function fetchAuthNonce(): Promise<string> {
  const response = await fetch("/api/auth/nonce");
  if (!response.ok) {
    throw new Error("Failed to get nonce");
  }
  const { nonce } = await response.json();

  if (!nonce) {
    throw new Error("Nonce is undefined");
  }

  return nonce;
}

// SIWE sign in mutation
const siweSignInMutation = async ({
  address,
  nonce,
  message,
  signature,
}: {
  address: string;
  nonce: string;
  message: string;
  signature: string;
}) => {
  console.log("siweSignInMutation", { address, nonce });
  // 4. Submit to server for verification
  const signInResponse = await fetch("/api/auth/signin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
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
const farcasterSignIn = async ({ nonce }: { nonce: string }) => {
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
  const { disconnect } = useDisconnect();
  const queryClient = useQueryClient();
  const { context } = useMiniAppContext();

  // Ref to track if Farcaster sign in is in progress
  const farcasterSignInInProgress = useRef(false);

  // State to track if we've already attempted auto sign-in
  const [hasAttemptedAutoSignIn, setHasAttemptedAutoSignIn] = useState(false);

  // Query for authentication status
  const {
    data: authData,
    isLoading: isLoadingAuth,
    error,
    refetch: checkAuth,
  } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchAuthStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const {
    data: authNonce,
    isLoading: isLoadingNonce,
    error: nonceError,
  } = useQuery({
    queryKey: ["authNonce"],
    queryFn: fetchAuthNonce,
    retry: 1,
    enabled: !authData?.authenticated && !isLoadingAuth,
  });

  // SIWE sign in mutation
  const siweSignInMut = useMutation({
    mutationFn: siweSignInMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
    onError: (error) => {
      console.error("SIWE sign in error:", error);
      disconnect();
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
      disconnect();
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
    onError: (error) => {
      console.error("Sign out error:", error);
    },
  });

  // Farcaster sign in handler
  const signInWithFarcaster = useCallback(async () => {
    if (!authNonce) {
      throw new Error("No nonce found");
    }

    // Prevent concurrent Farcaster sign in attempts
    if (farcasterSignInInProgress.current || farcasterSignInMut.isPending) {
      throw new Error("Farcaster sign in already in progress");
    }

    farcasterSignInInProgress.current = true;

    try {
      return await farcasterSignInMut.mutateAsync({
        nonce: authNonce,
      });
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
      !isLoadingAuth &&
      !farcasterSignInMut.isPending &&
      !farcasterSignInMut.isSuccess &&
      !farcasterSignInInProgress.current &&
      !hasAttemptedAutoSignIn &&
      authNonce
    ) {
      console.log("Triggering Farcaster sign in from AuthProvider", {
        context,
      });

      // Set both the ref and state to prevent multiple calls
      farcasterSignInInProgress.current = true;
      setHasAttemptedAutoSignIn(true);

      // Call the mutation immediately
      farcasterSignInMut.mutate({
        nonce: authNonce,
      });
    }
  }, [
    context,
    authData?.authenticated,
    isLoadingAuth,
    farcasterSignInMut.isPending,
    farcasterSignInMut.isSuccess,
    hasAttemptedAutoSignIn,
    farcasterSignInMut,
    authNonce,
  ]);

  const contextValue: AuthContextType = {
    isAuthenticated: authData?.authenticated || false,
    user: authData?.user || null,
    isLoading:
      isLoadingAuth ||
      siweSignInMut.isPending ||
      farcasterSignInMut.isPending ||
      signOutMut.isPending ||
      isLoadingNonce,
    error:
      error?.message ||
      siweSignInMut.error?.message ||
      farcasterSignInMut.error?.message ||
      signOutMut.error?.message ||
      nonceError?.message ||
      null,
    signInWithSiwe: siweSignInMut.mutateAsync,
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
    nonce: authNonce || null,
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
