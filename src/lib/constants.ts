export const CHALLENGE_DURATION_SECONDS = 60;
export const AUTH_SESSION_COOKIE_NAME = "auth_session";

// SIWE Authentication constants
export const SIWE_JWT_COOKIE_NAME = "siwe_auth_token";
export const SIWE_JWT_EXPIRES_IN = "7d";
export const SIWE_NONCE_EXPIRY_SECONDS = 10 * 60; // 10 minutes
export const SIWE_NONCE_REDIS_PREFIX = "siwe_nonce:";

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
