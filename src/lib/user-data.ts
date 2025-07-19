import {
  filterAddressesForBasename,
  getBasenameDataBatch,
} from "@/lib/basename";
import { getFidsFromAddresses, getUserDatasCached } from "@/lib/farcaster";
import { addEnsContracts } from "@ensdomains/ensjs";
import { batch, getName, getTextRecord } from "@ensdomains/ensjs/public";
import { createPublicClient, http, isHex } from "viem";
import { mainnet } from "viem/chains";

// Create ENS-enabled client
const ensClient = createPublicClient({
  chain: addEnsContracts(mainnet),
  transport: http(),
});

export interface StandardizedUserData {
  username: string;
  avatar: string | null;
  source: "farcaster" | "ens" | "basename";
}

export interface UserDataMaps {
  farcasterMap: Map<string, any>;
  ensDataMap: Map<string, { name: string; avatar: string | null }>;
  basenameDataMap: Map<string, { name: string; avatar: string | null }>;
}

export async function fetchUserDataForIds(
  userIds: string[]
): Promise<UserDataMaps> {
  // Separate user IDs by type
  const ethAddresses: string[] = [];
  const fids: number[] = [];

  userIds.forEach((userId) => {
    if (isHex(userId)) {
      ethAddresses.push(userId);
    } else {
      const fidNumber = parseInt(userId, 10);
      if (!isNaN(fidNumber)) {
        fids.push(fidNumber);
      }
    }
  });

  // Fetch user data from Farcaster
  const [ethUsers, fidUsers] = await Promise.all([
    ethAddresses.length > 0 ? getFidsFromAddresses(ethAddresses) : [],
    fids.length > 0 ? getUserDatasCached(fids) : [],
  ]);

  // Create lookup maps
  const farcasterMap = new Map();

  ethAddresses.forEach((address, index) => {
    if (ethUsers[index]) {
      farcasterMap.set(address, ethUsers[index]);
    }
  });

  fidUsers.forEach((user) => {
    farcasterMap.set(user.fid.toString(), user);
  });

  // Get addresses without Farcaster data for ENS and basename resolution
  const addressesWithoutFarcaster = ethAddresses.filter(
    (address) => !farcasterMap.has(address)
  );

  // Batch fetch ENS names for addresses without Farcaster data
  const ensDataMap = new Map();
  const basenameDataMap = new Map();

  if (addressesWithoutFarcaster.length > 0) {
    // Get ENS data
    try {
      // First, batch get all ENS names
      const nameResults = await batch(
        ensClient,
        ...addressesWithoutFarcaster.map((address) =>
          getName.batch({ address: address as `0x${string}` })
        )
      );

      // Collect addresses with ENS names
      const addressesWithNames: { address: string; name: string }[] = [];
      nameResults.forEach((result, index) => {
        if (result?.name) {
          addressesWithNames.push({
            address: addressesWithoutFarcaster[index],
            name: result.name,
          });
        }
      });

      // If we have names, batch get all avatars
      if (addressesWithNames.length > 0) {
        const avatarResults = await batch(
          ensClient,
          ...addressesWithNames.map(({ name }) =>
            getTextRecord.batch({ name, key: "avatar" })
          )
        );

        // Combine the results
        addressesWithNames.forEach(({ address, name }, index) => {
          ensDataMap.set(address, {
            name,
            avatar: avatarResults[index] || null,
          });
        });
      }
    } catch (error) {
      console.error("Error fetching ENS data:", error);
      // Continue without ENS data if there's an error
    }

    // Get basename data for addresses without ENS data
    const addressesWithoutEns = addressesWithoutFarcaster.filter(
      (address) => !ensDataMap.has(address)
    );

    if (addressesWithoutEns.length > 0) {
      try {
        const validAddresses = filterAddressesForBasename(
          addressesWithoutEns as `0x${string}`[]
        );

        if (validAddresses.length > 0) {
          const basenameResults = await getBasenameDataBatch(validAddresses);

          basenameResults.forEach(({ address, name, avatar }) => {
            if (name) {
              basenameDataMap.set(address, {
                name,
                avatar,
              });
            }
          });
        }
      } catch (error) {
        console.error("Error fetching basename data:", error);
        // Continue without basename data if there's an error
      }
    }
  }

  return {
    farcasterMap,
    ensDataMap,
    basenameDataMap,
  };
}

export function getStandardizedUserData(
  userId: string,
  userDataMaps: UserDataMaps
): StandardizedUserData | null {
  const { farcasterMap, ensDataMap, basenameDataMap } = userDataMaps;

  // Helper function to get Farcaster user
  const getFarcasterUser = (userId: string) => {
    if (isHex(userId)) {
      return farcasterMap.get(userId) || null;
    } else {
      return farcasterMap.get(userId) || null;
    }
  };

  const farcasterUser = getFarcasterUser(userId);
  if (farcasterUser) {
    return {
      username: farcasterUser.username,
      avatar: farcasterUser.pfp_url,
      source: "farcaster" as const,
    };
  }

  // Check for ENS data as fallback for ETH addresses
  if (isHex(userId)) {
    const ensData = ensDataMap.get(userId);
    if (ensData) {
      return {
        username: ensData.name,
        avatar: ensData.avatar,
        source: "ens" as const,
      };
    }

    // Check for basename data as final fallback
    const basenameData = basenameDataMap.get(userId);
    if (basenameData) {
      return {
        username: basenameData.name,
        avatar: basenameData.avatar,
        source: "basename" as const,
      };
    }
  }

  return null;
}
