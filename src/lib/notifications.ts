import {
  SendNotificationRequest,
  sendNotificationResponseSchema,
} from "@farcaster/frame-sdk";
import { db } from "./db";
import { FrameNotificationDetails } from "@farcaster/frame-node";
import { NotificationsBulkJobData } from "../types/jobs";
import { notificationsBulkQueue } from "./queue";

type SendFrameNotificationResult =
  | {
      state: "error";
      error: unknown;
    }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "success" };

export async function sendFrameNotifications({
  title,
  body,
  url,
  tokens,
  notificationId,
  targetUrl,
}: {
  /** The title of the notification - max 32 character */
  title: string;
  body: string;
  tokens: string[];
  /** The url to send the notification to */
  url: string;
  /** The url that will open when the notification is clicked */
  targetUrl: string;
  /** The id of the notification (defaults to a random uuid) */
  notificationId?: string;
}): Promise<SendFrameNotificationResult> {
  notificationId = notificationId || crypto.randomUUID();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notificationId,
      title,
      body,
      targetUrl,
      tokens: tokens,
    } satisfies SendNotificationRequest),
  });

  const responseJson = await response.json();

  if (response.status === 200) {
    const responseBody = sendNotificationResponseSchema.safeParse(responseJson);
    if (responseBody.success === false) {
      // Malformed response
      throw new Error("Malformed response");
    }

    if (responseBody.data.result.rateLimitedTokens.length) {
      // Rate limited
      throw new Error("Rate limited");
    }

    return { state: "success" };
  } else {
    // Error response
    const message = JSON.stringify(responseJson) || "Unknown error";
    throw new Error(message);
  }
}

export async function sendFrameNotification({
  title,
  body,
  targetUrl,
  notificationId,
  ...params
}: {
  title: string;
  body: string;
  targetUrl: string;
  notificationId?: string;
} & (
  | { fid: number }
  | {
      token: string;
      url: string;
    }
)) {
  let token: string;
  let url: string;

  if ("fid" in params) {
    const user = await db
      .selectFrom("users")
      .selectAll()
      .where("fid", "=", params.fid)
      .where("notificationUrl", "is not", null)
      .where("notificationToken", "is not", null)
      .executeTakeFirst();

    if (!user) {
      throw new Error("User not found");
    }

    token = user.notificationToken!;
    url = user.notificationUrl!;
  } else {
    token = params.token;
    url = params.url;
  }

  const result = await sendFrameNotifications({
    title,
    body,
    url,
    targetUrl,
    tokens: [token],
    notificationId,
  });

  return result;
}

export async function setUserNotificationDetails(
  fid: number,
  notificationDetails: FrameNotificationDetails
): Promise<void> {
  // Update user notification details
  await db
    .updateTable("users")
    .set({
      notificationUrl: notificationDetails.url,
      notificationToken: notificationDetails.token,
    })
    .where("fid", "=", fid)
    .execute();
}

export async function deleteUserNotificationDetails(
  fid: number
): Promise<void> {
  await db
    .updateTable("users")
    .set({
      notificationUrl: null,
      notificationToken: null,
    })
    .where("fid", "=", fid)
    .execute();
}

export async function notifyUsers({
  users,
  title,
  body,
  targetUrl,
  notificationId,
}: {
  users: { fid?: number; token: string; url: string }[];
  title: string;
  body: string;
  targetUrl: string;
  notificationId?: string;
}) {
  // Group users by notification url
  const usersByUrl = users.reduce((acc, user) => {
    const notificationUrl = user.url;
    if (!acc[notificationUrl]) {
      acc[notificationUrl] = [];
    }
    acc[notificationUrl].push(user);
    return acc;
  }, {} as Record<string, typeof users>);

  // Then chunk each webhook group into groups of 100
  const allChunks: Array<{
    notificationUrl: string;
    users: typeof users;
    chunkId: number;
  }> = [];
  Object.entries(usersByUrl).forEach(([notificationUrl, webhookUsers]) => {
    let chunkId = 0;

    for (let i = 0; i < webhookUsers.length; i += 100) {
      allChunks.push({
        notificationUrl,
        users: webhookUsers.slice(i, i + 100),
        chunkId: chunkId++,
      });
    }
  });

  const jobs = await notificationsBulkQueue.addBulk(
    allChunks.map((chunk) => ({
      name: `${title}-${new URL(chunk.notificationUrl).hostname}-${
        chunk.chunkId
      }`,
      data: {
        notifications: chunk.users.map((user) => ({
          token: user.token!,
          fid: user.fid,
        })),
        url: chunk.notificationUrl,
        title,
        body,
        targetUrl,
        notificationId,
      } satisfies NotificationsBulkJobData,
    }))
  );

  return jobs;
}
