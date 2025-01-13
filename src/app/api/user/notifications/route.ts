import { withAuth } from "@/lib/auth";
import { setUserNotificationDetails } from "@/lib/notifications";

export const PATCH = withAuth(async (req, user) => {
  const { token, url } = await req.json();

  if (token && url) {
    await setUserNotificationDetails(user.fid, {
      token,
      url,
    });
  }

  return Response.json({ success: true });
});
