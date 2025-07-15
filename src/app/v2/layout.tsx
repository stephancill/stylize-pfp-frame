"use client";

import Image from "next/image";
import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDisconnect } from "wagmi";
import { LogOut } from "lucide-react";
import { MiniAppReady } from "@/components/MiniAppReady";
import { Navigation } from "@/components/Navigation";
import { useIsMobile } from "@/hooks/use-mobile";

export default function V2Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, signOut, isLoading } = useAuth();
  const { disconnect } = useDisconnect();
  const isMobile = useIsMobile();

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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <MiniAppReady />

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
