export const CHALLENGE_DURATION_SECONDS = 60;
export const AUTH_SESSION_COOKIE_NAME = "auth_session";

// Jobs that send notifications to users in bulk
export const NOTIFICATIONS_BULK_QUEUE_NAME = "notifications-bulk";

export const FRAME_METADATA = {
  version: "next",
  imageUrl: `${process.env.APP_URL}/og.png`,
  button: {
    title: "Launch Frame",
    action: {
      type: "launch_frame",
      name: "Launch Frame",
      url: process.env.APP_URL,
      splashImageUrl: `${process.env.APP_URL}/splash.png`,
      splashBackgroundColor: "#f7f7f7",
    },
  },
};
