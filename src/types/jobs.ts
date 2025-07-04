export type NotificationsBulkJobData = {
  notifications: {
    fid?: number;
    token: string;
  }[];
  url: string;
  title: string;
  body: string;
  targetUrl: string;
  notificationId?: string;
};

export type StylizeImageJobData = {
  userId: string; // Changed from fid - can be FID or wallet address
  prompt: string; // This will be the base prompt/theme from the user
  userPfpUrl?: string; // URL of the user's current profile picture OR base64 data URL of uploaded image
  quoteId: string; // Added to link back to the original request
  n?: number; // Number of images to generate
  size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792"; // DALL-E 3 supported sizes
  // Potentially add other parameters like quality, style, etc. in the future
};
