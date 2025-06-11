"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { UserContextProvider } from "@/providers/UserContextProvider";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";

const queryClient = new QueryClient();

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Suspense>
          <UserContextProvider>{children}</UserContextProvider>
        </Suspense>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
