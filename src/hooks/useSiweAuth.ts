import { useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { createSiweMessage } from "viem/siwe";
import { base } from "wagmi/chains";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface AuthUser {
  address: string;
  chainId: number;
}

interface AuthResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

const AUTH_QUERY_KEY = ["siwe-auth"];

// Fetch authentication status
const fetchAuthStatus = async (): Promise<AuthResponse> => {
  const response = await fetch("/api/auth/me");

  if (response.ok) {
    return await response.json();
  }

  return { authenticated: false, user: null };
};

// Sign in mutation
const signInMutation = async ({
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
  return data.user;
};

// Sign out mutation
const signOutMutation = async () => {
  const response = await fetch("/api/auth/signout", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to sign out");
  }
};

export function useSiweAuth() {
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

  // Sign in mutation
  const signInMut = useMutation({
    mutationFn: signInMutation,
    onSuccess: () => {
      // Invalidate and refetch auth status after successful sign in
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
    onError: (error) => {
      console.error("Sign in error:", error);
    },
  });

  // Sign out mutation
  const signOutMut = useMutation({
    mutationFn: signOutMutation,
    onSuccess: () => {
      // Invalidate and refetch auth status after successful sign out
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
    onError: (error) => {
      console.error("Sign out error:", error);
    },
  });

  // Sign in handler
  const signIn = useCallback(async () => {
    if (!address || !isConnected) {
      throw new Error("Wallet not connected");
    }

    return signInMut.mutateAsync({
      address,
      signMessageAsync,
    });
  }, [address, isConnected, signMessageAsync, signInMut]);

  // Sign out handler
  const signOut = useCallback(async () => {
    return signOutMut.mutateAsync();
  }, [signOutMut]);

  // Clear auth state when wallet disconnects
  const clearAuthOnDisconnect = useCallback(() => {
    if (!isConnected && authData?.authenticated) {
      queryClient.setQueryData(AUTH_QUERY_KEY, {
        authenticated: false,
        user: null,
      });
    }
  }, [isConnected, authData?.authenticated, queryClient]);

  // Effect to clear auth when wallet disconnects
  clearAuthOnDisconnect();

  return {
    isAuthenticated: authData?.authenticated || false,
    user: authData?.user || null,
    isLoading: isLoading || signInMut.isPending || signOutMut.isPending,
    error:
      error?.message ||
      signInMut.error?.message ||
      signOutMut.error?.message ||
      null,
    signIn,
    signOut,
    checkAuth,
    // Helper to check if the current wallet matches the authenticated user
    isWalletAuthenticated: address && authData?.user?.address === address,
  };
}
