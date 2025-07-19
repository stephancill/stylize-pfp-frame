import { L2ResolverABI } from "@/abi/L2ResolverABI";
import {
  Address,
  ContractFunctionParameters,
  encodePacked,
  keccak256,
  namehash,
} from "viem";
import { multicall } from "viem/actions";
import { base, mainnet } from "viem/chains";
import { publicClient } from "./public-client";

export type Basename = `${string}.base.eth`;

export const BASENAME_L2_RESOLVER_ADDRESS =
  "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD";

export enum BasenameTextRecordKeys {
  Description = "description",
  Keywords = "keywords",
  Url = "url",
  Email = "email",
  Phone = "phone",
  Github = "com.github",
  Twitter = "com.twitter",
  Farcaster = "xyz.farcaster",
  Lens = "xyz.lens",
  Telegram = "org.telegram",
  Discord = "com.discord",
  Avatar = "avatar",
}

/**
 * Convert an chainId to a coinType hex for reverse chain resolution
 */
export const convertChainIdToCoinType = (chainId: number): string => {
  // L1 resolvers to addr
  if (chainId === mainnet.id) {
    return "addr";
  }

  const cointype = (0x80000000 | chainId) >>> 0;
  return cointype.toString(16).toLocaleUpperCase();
};

/**
 * Convert an address to a reverse node for ENS resolution
 */
export const convertReverseNodeToBytes = (
  address: Address,
  chainId: number
) => {
  const addressFormatted = address.toLocaleLowerCase() as Address;
  const addressNode = keccak256(addressFormatted.substring(2) as Address);
  const chainCoinType = convertChainIdToCoinType(chainId);
  const baseReverseNode = namehash(
    `${chainCoinType.toLocaleUpperCase()}.reverse`
  );
  const addressReverseNode = keccak256(
    encodePacked(["bytes32", "bytes32"], [baseReverseNode, addressNode])
  );
  return addressReverseNode;
};

export async function getBasename(address: Address): Promise<Basename | null> {
  try {
    const addressReverseNode = convertReverseNodeToBytes(address, base.id);
    const basename = await publicClient.readContract({
      abi: L2ResolverABI,
      address: BASENAME_L2_RESOLVER_ADDRESS,
      functionName: "name",
      args: [addressReverseNode],
    });
    if (basename) {
      return basename as Basename;
    }
    return null;
  } catch (error) {
    console.error("Error resolving Basename:", error);
    return null;
  }
}

export async function getBasenameAvatar(
  basename: Basename
): Promise<string | null> {
  try {
    const avatar = await publicClient.getEnsAvatar({
      name: basename,
      universalResolverAddress: BASENAME_L2_RESOLVER_ADDRESS,
    });
    return avatar;
  } catch (error) {
    console.error("Error resolving Basename avatar:", error);
    return null;
  }
}

export function buildBasenameTextRecordContract(
  basename: Basename,
  key: BasenameTextRecordKeys
): ContractFunctionParameters {
  return {
    abi: L2ResolverABI,
    address: BASENAME_L2_RESOLVER_ADDRESS,
    args: [namehash(basename), key],
    functionName: "text",
  };
}

// Multicall function to batch resolve basename data (names and avatars)
export async function getBasenameDataBatch(addresses: Address[]): Promise<
  Array<{
    address: Address;
    name: Basename | null;
    avatar: string | null;
  }>
> {
  if (addresses.length === 0) {
    return [];
  }

  try {
    // Step 1: Batch get all basename names using multicall
    const nameContracts = addresses.map((address) => {
      const addressReverseNode = convertReverseNodeToBytes(address, base.id);
      return {
        address: BASENAME_L2_RESOLVER_ADDRESS,
        abi: L2ResolverABI,
        functionName: "name",
        args: [addressReverseNode],
      } as const;
    });

    const nameResults = await multicall(publicClient, {
      contracts: nameContracts,
    });

    // Step 2: Collect addresses with valid basenames
    const addressesWithNames: {
      address: Address;
      name: Basename;
      index: number;
    }[] = [];
    nameResults.forEach((result: any, index: number) => {
      if (
        result.status === "success" &&
        result.result &&
        typeof result.result === "string" &&
        result.result.length > 0
      ) {
        addressesWithNames.push({
          address: addresses[index],
          name: result.result as Basename,
          index,
        });
      }
    });

    // Step 3: Batch get avatars for addresses with basenames using getEnsAvatar
    const avatarPromises = addressesWithNames.map(async ({ name }) => {
      try {
        const avatar = await publicClient.getEnsAvatar({
          name,
          universalResolverAddress: BASENAME_L2_RESOLVER_ADDRESS,
        });
        return avatar;
      } catch (error) {
        console.error(`Error getting avatar for ${name}:`, error);
        return null;
      }
    });

    const avatarResults = await Promise.all(avatarPromises);

    // Step 4: Combine results
    const results: Array<{
      address: Address;
      name: Basename | null;
      avatar: string | null;
    }> = [];

    addresses.forEach((address, index) => {
      const nameResult = nameResults[index];
      const hasValidName =
        nameResult.status === "success" &&
        nameResult.result &&
        typeof nameResult.result === "string" &&
        nameResult.result.length > 0;

      if (hasValidName) {
        const name = nameResult.result as Basename;

        // Find the corresponding avatar result
        const nameIndex = addressesWithNames.findIndex(
          (item) => item.address === address
        );
        const avatar = nameIndex >= 0 ? avatarResults[nameIndex] : null;

        results.push({
          address,
          name,
          avatar,
        });
      } else {
        results.push({
          address,
          name: null,
          avatar: null,
        });
      }
    });

    return results;
  } catch (error) {
    console.error("Error in basename batch resolution:", error);

    // Return empty results for all addresses on error
    return addresses.map((address) => ({
      address,
      name: null,
      avatar: null,
    }));
  }
}

// Utility function to filter addresses that need basename resolution
export function filterAddressesForBasename(addresses: Address[]): Address[] {
  // Filter out any invalid addresses
  return addresses.filter((address) => {
    return (
      address &&
      typeof address === "string" &&
      address.length === 42 &&
      address.startsWith("0x")
    );
  });
}
