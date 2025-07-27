"use client";

import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza";
import { useAuth } from "@/providers/AuthProvider";
import { Loader2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { base } from "viem/chains";
import { useAccount, useConnect } from "wagmi";

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ isOpen, onOpenChange }: AuthModalProps) {
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { address, isConnected } = useAccount();
  const { signInWithSiwe, isLoading, nonce } = useAuth();
  const [hasAttemptedSignIn, setHasAttemptedSignIn] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setHasAttemptedSignIn(false);
    }
  }, [isOpen]);

  const handleConnectWallet = async (connector: any) => {
    if (!nonce) {
      throw new Error("Nonce not ready");
    }

    setHasAttemptedSignIn(false);
    connect(
      {
        connector,
        capabilities: {
          signInWithEthereum: {
            nonce,
            chainId: base.id,
            issuedAt: new Date().toISOString(),
            version: "1",
          },
        },
      },
      {
        onSuccess: ({ capabilities, accounts }) => {
          if (capabilities?.signInWithEthereum && accounts.length > 0) {
            setHasAttemptedSignIn(false);
            signInWithSiwe({
              message: capabilities.signInWithEthereum.message,
              signature: capabilities.signInWithEthereum.signature,
              address: accounts[0],
              nonce,
            });
          }
        },
      }
    );
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

        <CredenzaBody>
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
        </CredenzaBody>
      </CredenzaContent>
    </Credenza>
  );
}
