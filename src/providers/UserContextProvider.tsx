"use client";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import sdk, { Context } from "@farcaster/frame-sdk"; // Using Context as FarcasterContext

// The user type from the Farcaster SDK context
type SdkUser = Context.FrameContext["user"];

interface UserContextType {
  user: SdkUser | null | undefined;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SdkUser | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadContext = async () => {
      setIsLoading(true);
      try {
        const frameContext = await sdk.context;
        sdk.actions.ready();
        setUser(frameContext?.user);
      } catch (error) {
        console.error("Error loading Farcaster SDK context:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadContext();
  }, []);

  return (
    <UserContext.Provider value={{ user, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserContextProvider");
  }
  return context;
}

// Example of how you might map SdkUser to AppUser if needed later
// function mapSdkUserToAppUser(sdkUser: SdkUser | null | undefined): AppUser | null | undefined {
//   if (!sdkUser) return undefined;
//   return {
//     id: String(sdkUser.fid), // Assuming fid can be stringified to id
//     fid: sdkUser.fid,
//     username: sdkUser.username,
//     displayName: sdkUser.displayName,
//     pfpUrl: sdkUser.pfpUrl,
//     // Add other transformations as necessary
//   };
// }
