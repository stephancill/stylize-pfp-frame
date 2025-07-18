import { useState, useEffect } from "react";
import sdk from "@farcaster/frame-sdk";

export function useMiniAppContext() {
  const [context, setContext] = useState<Awaited<typeof sdk.context>>();

  useEffect(() => {
    const loadContext = async () => {
      try {
        const result = await sdk.context;
        result.user.pfpUrl;
        setContext(result);
      } catch (error) {
        console.error("Error checking mini app context:", error);
        setContext(undefined);
      }
    };

    loadContext();
  }, []);

  return context;
}
