"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { UserContextProvider } from "@/providers/UserContextProvider";
import { ImageSelectionProvider } from "@/providers/ImageSelectionProvider";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from "@/providers/PostHogProvider";
import { ThemeProvider } from "@/components/theme-provider";

const queryClient = new QueryClient();

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <Suspense>
            <UserContextProvider>
              <ImageSelectionProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                  disableTransitionOnChange
                >
                  {children}
                </ThemeProvider>
              </ImageSelectionProvider>
            </UserContextProvider>
          </Suspense>
          <Toaster />
        </QueryClientProvider>
      </WagmiProvider>
    </PostHogProvider>
  );
}
