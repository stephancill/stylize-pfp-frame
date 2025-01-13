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
