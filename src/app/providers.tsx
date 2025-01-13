"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "../providers/SessionProvider";
import { Suspense } from "react";

const queryClient = new QueryClient();

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense>
        <SessionProvider>{children}</SessionProvider>
      </Suspense>
    </QueryClientProvider>
  );
}
