import { useState, useEffect } from "react";
import sdk from "@farcaster/frame-sdk";

export function useMiniApp() {
  const [isInMiniApp, setIsInMiniApp] = useState<boolean | undefined>(
    undefined
  );

  useEffect(() => {
    const checkMiniApp = async () => {
      try {
        const result = await sdk.isInMiniApp();
        setIsInMiniApp(result);
      } catch (error) {
        console.error("Error checking mini app context:", error);
        setIsInMiniApp(false);
      }
    };

    checkMiniApp();
  }, []);

  return !!isInMiniApp;
}
