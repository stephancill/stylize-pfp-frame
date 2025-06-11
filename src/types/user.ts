export interface UnifiedUser {
  // Farcaster info
  fid?: number;
  displayName?: string;
  username?: string;
  pfpUrl?: string;

  // Wallet info
  walletAddress?: string;

  // Derived properties
  id: string; // Either FID or wallet address
  hasWallet: boolean;
  hasFarcaster: boolean;
  profileImage?: string; // pfpUrl if available
}

export function createUnifiedUser(
  farcasterUser?: {
    fid: number;
    displayName?: string;
    username?: string;
    pfpUrl?: string;
  } | null,
  walletAddress?: string
): UnifiedUser | null {
  if (!farcasterUser && !walletAddress) {
    return null;
  }

  const hasFarcaster = !!farcasterUser?.fid;
  const hasWallet = !!walletAddress;

  // Prioritize FID as ID if available, otherwise use wallet address
  const id = hasFarcaster ? farcasterUser!.fid.toString() : walletAddress!;

  return {
    fid: farcasterUser?.fid,
    displayName: farcasterUser?.displayName,
    username: farcasterUser?.username,
    pfpUrl: farcasterUser?.pfpUrl,
    walletAddress,
    id,
    hasWallet,
    hasFarcaster,
    profileImage: farcasterUser?.pfpUrl,
  };
}
