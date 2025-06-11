"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useSiweAuth } from "@/hooks/useSiweAuth";
import { Button } from "@/components/ui/button";

export function SiweAuthButton() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const {
    isAuthenticated,
    user,
    isLoading,
    error,
    signIn,
    signOut,
    isWalletAuthenticated,
  } = useSiweAuth();

  const handleConnect = () => {
    const connector = connectors[0]; // Use the first available connector (Coinbase Wallet)
    if (connector) {
      connect({ connector });
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error("Sign in failed:", error);
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
    return <Button disabled>Loading...</Button>;
  }

  if (!isConnected) {
    return <Button onClick={handleConnect}>Connect Wallet</Button>;
  }

  if (isConnected && !isAuthenticated) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-600">
          Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>
        <div className="flex gap-2">
          <Button onClick={handleSignIn}>Sign In with Ethereum</Button>
          <Button variant="outline" onClick={() => disconnect()}>
            Disconnect
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-green-600">
          Authenticated: {user.address.slice(0, 6)}...{user.address.slice(-4)}
        </p>
        {!isWalletAuthenticated && (
          <p className="text-sm text-orange-600">
            ⚠️ Authenticated wallet differs from connected wallet
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
          <Button variant="outline" onClick={() => disconnect()}>
            Disconnect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
