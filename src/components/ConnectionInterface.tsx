"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useConnect, useDisconnect } from "wagmi";
import { truncateAddress } from "../lib/utils";

interface ConnectionInterfaceProps {
  connectedAddress?: string;
  hasAuth: boolean;
}

export function ConnectionInterface({
  connectedAddress,
  hasAuth,
}: ConnectionInterfaceProps) {
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (hasAuth && connectedAddress) {
    // Show connected wallet info
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-center space-x-2">
          <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Wallet: {truncateAddress(connectedAddress)}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => disconnect()}
            className="h-6 w-6 p-0 hover:bg-red-100"
          >
            <X className="h-3 w-3 text-gray-500 hover:text-red-500" />
          </Button>
        </div>
      </div>
    );
  }

  if (hasAuth && !connectedAddress) {
    // Show wallet connection options for authenticated users without wallet
    return (
      <div className="flex flex-col items-center space-y-2">
        {connectors.map((connector) => (
          <div key={connector.id}>
            <Button onClick={() => connect({ connector })}>
              {connector.name}
            </Button>
          </div>
        ))}
      </div>
    );
  }

  if (!hasAuth && connectedAddress) {
    // Show wallet info for wallet-only users
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-center space-x-2">
          <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Wallet: {truncateAddress(connectedAddress)}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => disconnect()}
            className="h-6 w-6 p-0 hover:bg-red-100"
          >
            <X className="h-3 w-3 text-gray-500 hover:text-red-500" />
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          Wallet connected - you can generate characters by uploading images
        </p>
      </div>
    );
  }

  // No authentication - show connection options
  return (
    <div className="text-center space-y-4">
      <p className="text-lg text-gray-700 mb-4">
        Connect your wallet to start generating characters
      </p>
      <div className="space-y-2">
        {connectors.map((connector) => (
          <Button
            key={connector.id}
            onClick={() => connect({ connector })}
            className="w-full"
          >
            {connector.icon && <img src={connector.icon} className="w-4 h-4" />}
            {connector.name}
          </Button>
        ))}
      </div>
      <p className="text-sm text-gray-500 mt-4">
        You can also sign in with Farcaster for additional features
      </p>
    </div>
  );
}
