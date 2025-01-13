import { withAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { User } from "@/types/user";
import { sql } from "kysely";

export const GET = withAuth(async (req, luciaUser) => {
  // Check if the fid is already registered
  const dbUser = await db
    .selectFrom("users")
    .selectAll()
    .where("users.id", "=", luciaUser.id)
    .executeTakeFirst();

  if (!dbUser) {
    return Response.json({ error: "User not found" }, { status: 400 });
  }

  const user: User = {
    fid: dbUser.fid,
    id: dbUser.id,
    notificationsEnabled: dbUser.notificationUrl !== null,
  };

  return Response.json(user);
});
