"use client";

import Image from "next/image";
import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDisconnect } from "wagmi";
import { LogOut, Loader2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { AuthModal } from "@/components/AuthModal";
import { useAccount, useConnect } from "wagmi";
import { useEffect, useState } from "react";
import { useMiniAppContext } from "@/providers/MiniAppContextProvider";
import { PendingJobsButton } from "@/components/PendingJobsButton";

export default function V2Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, signOut, isLoading, signInWithSiwe } = useAuth();
  const { disconnect } = useDisconnect();
  const isMobile = useIsMobile();

  // Auth-related state
  const { connect, connectors } = useConnect();
  const { address, isConnected } = useAccount();
  const { context } = useMiniAppContext();
  const isInMiniApp = !!context;
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasAttemptedSignIn, setHasAttemptedSignIn] = useState(false);

  // Auto-connect in mini app context
  useEffect(() => {
    if (
      isInMiniApp &&
      !isAuthenticated &&
      connectors.length > 0 &&
      !isConnecting
    ) {
      handleMiniAppConnect();
    }
  }, [isInMiniApp, isAuthenticated, connectors, isConnecting]);

  // Auto-trigger SIWE when wallet connects in mini app
  useEffect(() => {
    if (
      isInMiniApp &&
      isConnected &&
      address &&
      !hasAttemptedSignIn &&
      isConnecting
    ) {
      setHasAttemptedSignIn(true);
      handleSiweSignIn();
    }
  }, [isInMiniApp, isConnected, address, hasAttemptedSignIn, isConnecting]);

  // Auto-show auth modal when not authenticated and not in mini app
  useEffect(() => {
    if (!isAuthenticated && !isInMiniApp && !isLoading && !showAuthModal) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated, isInMiniApp, isLoading, showAuthModal]);

  // Auto-close auth modal when authenticated
  useEffect(() => {
    if (isAuthenticated && showAuthModal) {
      setShowAuthModal(false);
    }
  }, [isAuthenticated, showAuthModal]);

  const handleMiniAppConnect = async () => {
    setIsConnecting(true);
    setHasAttemptedSignIn(false);
    try {
      await connect({ connector: connectors[0] });
    } catch (error) {
      console.error("Connection failed:", error);
      setIsConnecting(false);
    }
  };

  const handleSiweSignIn = async () => {
    try {
      await signInWithSiwe();
    } catch (error) {
      console.error("Sign in failed:", error);
    } finally {
      setIsConnecting(false);
      setHasAttemptedSignIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Sign out from the auth system
      await signOut();
      // Disconnect the wallet
      disconnect();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  // Show loading state
  if (isLoading || isConnecting) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <AuthModal isOpen={showAuthModal} onOpenChange={setShowAuthModal} />
      {/* Header with logo and navigation */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center space-x-4">
          <Image
            src="/splash.png"
            alt="Logo"
            width={32}
            height={32}
            className="rounded-lg"
          />
        </div>

        {/* Desktop Navigation */}
        {!isMobile && <Navigation />}

        <div className="flex items-center space-x-2">
          <ModeToggle />
          <PendingJobsButton />
          {isAuthenticated && (
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              disabled={isLoading}
              className="h-8 px-2 text-xs hover:bg-red-100 hover:text-red-600"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Sign Out
            </Button>
          )}
        </div>
      </div>
      {/* Main content with mobile bottom padding */}
      <div className={isMobile ? "pb-20" : ""}>{children}</div>
      {/* Mobile Navigation */}
      {isMobile && <Navigation />}
    </div>
  );
}
