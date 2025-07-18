"use client";

import { AuthModal } from "@/components/AuthModal";
import { ModeToggle } from "@/components/ModeToggle";
import { Navigation } from "@/components/Navigation";
import { PendingJobsButton } from "@/components/PendingJobsButton";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { truncateAddress } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useMiniAppContext } from "@/providers/MiniAppContextProvider";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { Loader2, LogOut } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useConnect, useDisconnect } from "wagmi";

export default function V2Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, signOut, isLoading, user } = useAuth();
  const { disconnect } = useDisconnect();
  const isMobile = useIsMobile();
  const { connect } = useConnect();
  const { context } = useMiniAppContext();
  const isInMiniApp = !!context;
  const [showAuthModal, setShowAuthModal] = useState(false);

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

  useEffect(() => {
    if (isInMiniApp) {
      connect({ connector: miniAppConnector() });
    }
  }, [connect, isInMiniApp]);

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

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!user) {
    return <AuthModal isOpen={showAuthModal} onOpenChange={setShowAuthModal} />;
  }

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        paddingBottom: context?.client.safeAreaInsets?.bottom,
      }}
    >
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
          <PendingJobsButton />
          <ModeToggle />
          {isAuthenticated && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  className="h-8 px-2 text-xs"
                >
                  {context?.user?.username ||
                    truncateAddress(user?.address || "")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40" align="end">
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  className="w-full justify-start text-red-600 hover:bg-red-100 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              </PopoverContent>
            </Popover>
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
