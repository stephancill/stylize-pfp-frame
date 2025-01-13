import { Worker } from "bullmq";
import { NOTIFICATIONS_BULK_QUEUE_NAME } from "../lib/constants";
import { redisQueue } from "../lib/redis";
import { NotificationsBulkJobData } from "../types/jobs";
import { sendFrameNotifications } from "../lib/notifications";

export const notificationsBulkWorker = new Worker<NotificationsBulkJobData>(
  NOTIFICATIONS_BULK_QUEUE_NAME,
  async (job) => {
    const { notifications, url, body, notificationId, targetUrl, title } =
      job.data;

    const tokens = notifications.map(({ token }) => token);

    const result = await sendFrameNotifications({
      tokens,
      title,
      body,
      url,
      targetUrl,
      notificationId,
    });

    return result;
  },
  { connection: redisQueue }
);
