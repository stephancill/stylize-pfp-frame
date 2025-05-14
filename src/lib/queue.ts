import { Queue } from "bullmq";
import { NOTIFICATIONS_BULK_QUEUE_NAME, STYLIZE_IMAGE_QUEUE_NAME } from "./constants";
import { redisQueue } from "./redis";
import { StylizeImageJobData } from "@/types/jobs"; // Assuming @ alias works here or adjust path

export const notificationsBulkQueue = new Queue(NOTIFICATIONS_BULK_QUEUE_NAME, {
  connection: redisQueue,
});

export const stylizeImageQueue = new Queue<StylizeImageJobData>(STYLIZE_IMAGE_QUEUE_NAME, {
  connection: redisQueue,
});
