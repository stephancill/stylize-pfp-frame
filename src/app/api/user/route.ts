import { withAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserData } from "@/lib/farcaster";
import { withCache } from "@/lib/redis";
import { User } from "@/types/user";
import { UserDataType } from "@farcaster/core";
import { getUserDataKey } from "../../../lib/keys";

export const GET = withAuth(async (req, luciaUser) => {
  const dbUser = await db
    .selectFrom("users")
    .selectAll()
    .where("users.id", "=", luciaUser.id)
    .executeTakeFirst();

  if (!dbUser) {
    return Response.json({ error: "User not found" }, { status: 400 });
  }

  let farcasterUser: Record<UserDataType, string | undefined> = {} as Record<
    UserDataType,
    string | undefined
  >;

  // Only fetch Farcaster data if user has an FID (not wallet-only)
  if (dbUser.fid) {
    farcasterUser = await withCache(
      getUserDataKey(dbUser.fid),
      async () => {
        return await getUserData(dbUser.fid!);
      },
      {
        ttl: 60 * 60 * 24 * 7, // 1 week
      }
    );
  }

  const user: User = {
    fid: dbUser.fid,
    id: dbUser.id,
    notificationsEnabled: dbUser.notificationUrl !== null,
    username: farcasterUser[UserDataType.USERNAME],
    imageUrl: farcasterUser[UserDataType.PFP],
  };

  return Response.json(user);
});
