"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useConnect, useAccount } from "wagmi";
import {
  Credenza,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza";
import { Loader2, Wallet, User } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ isOpen, onOpenChange }: AuthModalProps) {
  const { connect, connectors } = useConnect();
  const { address, isConnected } = useAccount();
  const { signInWithSiwe, isLoading } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasAttemptedSignIn, setHasAttemptedSignIn] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsConnecting(false);
      setHasAttemptedSignIn(false);
    }
  }, [isOpen]);

  // Auto-trigger SIWE when wallet connects
  useEffect(() => {
    if (isConnected && address && !hasAttemptedSignIn && isConnecting) {
      setHasAttemptedSignIn(true);
      handleSiweSignIn();
    }
  }, [isConnected, address, hasAttemptedSignIn, isConnecting]);

  const handleConnectWallet = async (connector: any) => {
    setIsConnecting(true);
    setHasAttemptedSignIn(false);
    try {
      await connect({ connector });
    } catch (error) {
      console.error("Connection failed:", error);
      setIsConnecting(false);
    }
  };

  const handleSiweSignIn = async () => {
    try {
      await signInWithSiwe();
      // Close modal on successful sign in
      onOpenChange(false);
    } catch (error) {
      console.error("Sign in failed:", error);
    } finally {
      setIsConnecting(false);
      setHasAttemptedSignIn(false);
    }
  };

  return (
    <Credenza open={isOpen} onOpenChange={() => {}}>
      <CredenzaContent className="sm:max-w-md">
        <CredenzaHeader>
          <CredenzaTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Sign In
          </CredenzaTitle>
          <CredenzaDescription>
            Connect your wallet to access your creations and generate new
            images.
          </CredenzaDescription>
        </CredenzaHeader>

        <div className="flex flex-col gap-4 p-6">
          {isConnecting || isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500 mr-2" />
              <span className="text-sm text-gray-600">
                {isConnected ? "Signing in..." : "Connecting..."}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {connectors.map((connector) => (
                <Button
                  key={connector.id}
                  onClick={() => handleConnectWallet(connector)}
                  className="w-full"
                >
                  {connector.icon && (
                    <img
                      src={connector.icon}
                      alt={connector.name}
                      className="w-4 h-4 mr-2"
                    />
                  )}
                  {connector.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CredenzaContent>
    </Credenza>
  );
}
