import { Message, UserDataAddMessage, UserDataType } from "@farcaster/core";
import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";
import { type User as NeynarUser } from "@neynar/nodejs-sdk/build/api";
import { getUserDataKey } from "./keys";
import { redisCache } from "./redis";

export async function getUserData(fid: number) {
  const res = await fetch(`${process.env.HUB_URL}/v1/userDataByFid?fid=${fid}`);

  if (!res.ok) {
    throw new Error(
      `Failed to fetch user data: ${res.statusText} (${res.status})`
    );
  }

  const data = (await res.json()) as { messages: any[] };

  const userData = data.messages.reduce<
    Record<UserDataType, string | undefined>
  >((acc, message) => {
    const decoded = Message.fromJSON(message) as UserDataAddMessage;

    acc[decoded.data.userDataBody.type] = decoded.data.userDataBody.value;
    return acc;
  }, {} as Record<UserDataType, string | undefined>);

  return userData;
}

export async function getUserDatasCached(
  fids: number[]
): Promise<NeynarUser[]> {
  if (fids.length === 0) {
    return [];
  }

  const neynarClient = new NeynarAPIClient(
    new Configuration({
      apiKey: process.env.NEYNAR_API_KEY!,
    })
  );

  // Get users from cache
  const cachedUsersRes = await redisCache.mget(
    fids.map((fid) => getUserDataKey(fid))
  );
  const cachedUsers: NeynarUser[] = cachedUsersRes
    .filter((user) => user !== null)
    .map((user) => JSON.parse(user));

  // Users to fetch
  const cachedUserFids = new Set(cachedUsers.map((user) => user.fid));
  const uncachedFids = fids.filter((fid) => !cachedUserFids.has(fid));

  if (uncachedFids.length === 0) {
    return cachedUsers;
  }

  // TODO: Implement pagination
  if (uncachedFids.length > 100) {
    throw new Error("Can't fetch more than 100 users at a time");
  }

  const res = await neynarClient.fetchBulkUsers({ fids: uncachedFids });

  // Cache fetched users
  await redisCache.mset(
    res.users
      .map((user) => [getUserDataKey(user.fid), JSON.stringify(user)])
      .flat()
  );

  // Set expiration for all newly cached users
  let multi = redisCache.multi();
  for (const user of res.users) {
    multi = multi.expire(getUserDataKey(user.fid), 60 * 60 * 24 * 3); // 3 days
  }
  await multi.exec();

  return [...cachedUsers, ...res.users];
}
