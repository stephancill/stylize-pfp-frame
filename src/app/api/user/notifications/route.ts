import { withAuth } from "@/lib/siwe-auth";
import { setUserNotificationDetails } from "@/lib/notifications";

export const PATCH = withAuth(async ({ req, user }) => {
  const { token, url } = await req.json();

  if (!user.fid) {
    return Response.json({ error: "Invalid user" }, { status: 400 });
  }

  if (token && url) {
    await setUserNotificationDetails(user.fid, {
      token,
      url,
    });
  }

  return Response.json({ success: true });
});
