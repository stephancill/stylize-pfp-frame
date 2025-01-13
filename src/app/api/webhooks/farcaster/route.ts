import {
  deleteUserNotificationDetails,
  sendFrameNotification,
  setUserNotificationDetails,
} from "@/lib/notifications";
import {
  createVerifyAppKeyWithHub,
  ParseWebhookEvent,
  parseWebhookEvent,
} from "@farcaster/frame-node";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const requestJson = await request.json();
  const verifier = createVerifyAppKeyWithHub(process.env.HUB_URL!);

  let data;
  try {
    data = await parseWebhookEvent(requestJson, verifier);
  } catch (e: unknown) {
    const error = e as ParseWebhookEvent.ErrorType;

    switch (error.name) {
      case "VerifyJsonFarcasterSignature.InvalidDataError":
      case "VerifyJsonFarcasterSignature.InvalidEventDataError":
        // The request data is invalid
        return Response.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      case "VerifyJsonFarcasterSignature.InvalidAppKeyError":
        // The app key is invalid
        return Response.json(
          { success: false, error: error.message },
          { status: 401 }
        );
      case "VerifyJsonFarcasterSignature.VerifyAppKeyError":
        // Internal error verifying the app key (caller may want to try again)
        return Response.json(
          { success: false, error: error.message },
          { status: 500 }
        );
    }
  }

  const fid = data.fid;
  const event = data.event;

  switch (event.event) {
    case "frame_added":
      if (event.notificationDetails) {
        await setUserNotificationDetails(fid, event.notificationDetails);
        await sendFrameNotification({
          token: event.notificationDetails.token,
          url: event.notificationDetails.url,
          title: "Welcome to Frame",
          body: "This frame has been added.",
          targetUrl: process.env.APP_URL,
        });
      } else {
        await deleteUserNotificationDetails(fid);
      }

      break;
    case "frame_removed":
      await deleteUserNotificationDetails(fid);

      break;
    case "notifications_enabled":
      await setUserNotificationDetails(fid, event.notificationDetails);
      await sendFrameNotification({
        token: event.notificationDetails.token,
        url: event.notificationDetails.url,
        title: "Notifications enabled",
        body: "Notifications have been enabled.",
        targetUrl: process.env.APP_URL,
      });

      break;
    case "notifications_disabled":
      await deleteUserNotificationDetails(fid);

      break;
  }

  return Response.json({ success: true });
}
