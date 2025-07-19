"use client";

import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza";
import { useAuth } from "@/providers/AuthProvider";
import { Loader2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ isOpen, onOpenChange }: AuthModalProps) {
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { address, isConnected } = useAccount();
  const { signInWithSiwe, isLoading } = useAuth();
  const [hasAttemptedSignIn, setHasAttemptedSignIn] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
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
    setHasAttemptedSignIn(false);
    connect({ connector });
  };

  const handleSiweSignIn = async () => {
    try {
      await signInWithSiwe();
      // Close modal on successful sign in
      onOpenChange(false);
    } catch (error) {
      console.error("Sign in failed:", error);
    } finally {
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

        <div className="flex flex-col gap-4">
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
                  className="w-full justify-start"
                >
                  <div className="rounded-sm overflow-hidden">
                    {connector.icon && (
                      <img
                        src={connector.icon}
                        alt={connector.name}
                        className="w-4 h-4"
                      />
                    )}
                    {connector.id === "baseAccountSDK" && !connector.icon && (
                      <img
                        src={"/base-logo.png"}
                        alt={connector.name}
                        className="w-4 h-4"
                      />
                    )}
                  </div>
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
