import { Queue } from "bullmq";
import { NOTIFICATIONS_BULK_QUEUE_NAME } from "./constants";
import { redisQueue } from "./redis";

export const notificationsBulkQueue = new Queue(NOTIFICATIONS_BULK_QUEUE_NAME, {
  connection: redisQueue,
});
