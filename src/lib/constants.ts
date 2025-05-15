export const CHALLENGE_DURATION_SECONDS = 60;
export const AUTH_SESSION_COOKIE_NAME = "auth_session";

// Jobs that send notifications to users in bulk
export const NOTIFICATIONS_BULK_QUEUE_NAME = "notifications-bulk";

// Jobs that stylize images for users
export const STYLIZE_IMAGE_QUEUE_NAME = "stylize-image";

export const FRAME_METADATA = {
  version: "next",
  imageUrl: `${process.env.APP_URL}/og.png`,
  iconUrl: `${process.env.APP_URL}/splash.png`,
  button: {
    title: "Stylize my PFP",
    action: {
      type: "launch_frame",
      name: "Stylize my PFP",
      url: process.env.APP_URL,
      splashImageUrl: `${process.env.APP_URL}/splash.png`,
      splashBackgroundColor: "#ffffff",
    },
  },
};
