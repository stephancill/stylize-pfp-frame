"use client";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import sdk from "@farcaster/frame-sdk";

interface MiniAppContextType {
  context: Awaited<typeof sdk.context> | null | undefined;
  isLoading: boolean;
}

const MiniAppContext = createContext<MiniAppContextType | undefined>(undefined);

export function MiniAppContextProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<Awaited<typeof sdk.context>>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadContext = async () => {
      setIsLoading(true);
      try {
        const frameContext = await sdk.context;
        sdk.actions.ready();
        setContext(frameContext);
      } catch (error) {
        console.error("Error loading Farcaster SDK context:", error);
        setContext(undefined);
      } finally {
        setIsLoading(false);
      }
    };

    loadContext();
  }, []);

  return (
    <MiniAppContext.Provider value={{ context, isLoading }}>
      {children}
    </MiniAppContext.Provider>
  );
}

export function useMiniAppContext() {
  const context = useContext(MiniAppContext);
  if (context === undefined) {
    throw new Error(
      "useMiniAppContext must be used within a MiniAppContextProvider"
    );
  }
  return context;
}
