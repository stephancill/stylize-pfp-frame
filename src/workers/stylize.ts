import { db } from "@/lib/db";
import { sendFrameNotification } from "@/lib/notifications";
import { Worker } from "bullmq";
import OpenAI, { toFile } from "openai"; // Using the official OpenAI SDK
import sharp from "sharp"; // Import sharp
import { STYLIZE_IMAGE_QUEUE_NAME } from "../lib/constants";
import { redisQueue } from "../lib/redis";
import { StylizeImageJobData } from "../types/jobs";

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "Missing OpenAI API key. Please set OPENAI_API_KEY environment variable for the worker."
  );
}

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const stylizeImageWorker = new Worker<StylizeImageJobData>(
  STYLIZE_IMAGE_QUEUE_NAME,
  async (job) => {
    const { userId, prompt, userPfpUrl, quoteId, n = 1 } = job.data;

    if (!quoteId) {
      console.error(
        `Job ID ${job.id} for userId ${userId}: Missing quoteId. Cannot update database record.`
      );
      throw new Error("quoteId is required to update the database.");
    }
    if (!quoteId) {
      console.error(
        `Job ID ${job.id} for userId ${userId}: Missing quoteId. Cannot update database record.`
      );
      throw new Error("quoteId is required to update the database.");
    }

    console.log(
      `Processing image generation job for userId: ${userId}, quoteId: ${quoteId} with prompt: "${prompt}"${
        userPfpUrl ? ` and PFP URL: ${userPfpUrl.substring(0, 50)}` : ""
      }...`
    );

    try {
      let firstImageB64Json: string;

      if (userPfpUrl) {
        let imageBuffer: Buffer;
        let contentType: string;

        // Check if userPfpUrl is a data URL or regular URL
        if (userPfpUrl.startsWith("data:")) {
          // Handle data URL case
          console.log(`Processing uploaded image data URL for job ${job.id}`);

          const [mimeInfo, base64Data] = userPfpUrl.split(",");
          if (!base64Data) {
            throw new Error("Invalid data URL format: missing base64 data");
          }

          // Extract content type from data URL
          const mimeMatch = mimeInfo.match(/data:([^;]+)/);
          contentType = mimeMatch ? mimeMatch[1] : "image/png";

          // Convert base64 to buffer
          imageBuffer = Buffer.from(base64Data, "base64");
        } else {
          // Handle regular URL case
          console.log(`Fetching image from URL for job ${job.id}: ${userPfpUrl}`);

          const imageResponse = await fetch(userPfpUrl);
          if (!imageResponse.ok) {
            throw new Error(
              `Failed to fetch image from ${userPfpUrl}: ${imageResponse.statusText}`
            );
          }
          imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          contentType = imageResponse.headers.get("content-type") || "image/png";
        }

        const imageFile = await toFile(imageBuffer, "profile.png", {
          type: contentType,
        });

        const response = await openaiClient.images.edit({
          model: "gpt-image-1",
          image: imageFile,
          prompt: prompt,
          n: n,
          size: "1024x1024",
        });

        if (
          !response.data ||
          response.data.length === 0 ||
          !response.data[0].b64_json
        ) {
          throw new Error(
            "No b64_json data received from OpenAI API after edit."
          );
        }

        firstImageB64Json = response.data[0].b64_json;
      } else {
        const response = await openaiClient.images.generate({
          model: "dall-e-3",
          prompt: prompt,
          n: n,
          size: "1024x1024",
          response_format: "b64_json",
        });

        if (
          !response.data ||
          response.data.length === 0 ||
          !response.data[0].b64_json
        ) {
          throw new Error(
            "No b64_json data received from OpenAI API after generation."
          );
        }

        firstImageB64Json = response.data[0].b64_json;
      }

      // Convert base64 to buffer
      const generatedImageBuffer = Buffer.from(firstImageB64Json, "base64");

      // Resize image
      const resizedImageBuffer = await sharp(generatedImageBuffer)
        .resize(512, 512)
        .png()
        .toBuffer();

      // Convert resized buffer back to base64
      const resizedImageB64Json = resizedImageBuffer.toString("base64");

      await db
        .updateTable("generatedImages")
        .set({
          status: "completed",
          imageDataUrl: `data:image/png;base64,${resizedImageB64Json}`, // Save resized image
        })
        .where("quoteId", "=", quoteId)
        .execute();

      try {
        // Only notify if userId is a numeric FID (Farcaster user)
        const parsedUserId = parseInt(userId);
        if (!isNaN(parsedUserId)) {
          await sendFrameNotification({
            fid: parsedUserId,
            title: "Stylize complete",
            body: "Your profile picture has been stylized",
            targetUrl: process.env.APP_URL,
          });
        } else {
          console.log(`Skipping notification for wallet-only user: ${userId}`);
        }
      } catch (error) {
        console.error(
          `Job ID ${job.id} for quoteId ${quoteId}: Failed to notify user -`,
          error
        );
      }

      console.log(
        `Job ID ${job.id} for quoteId ${quoteId} completed. Image saved to DB.`
      );
      return { b64JsonImage: resizedImageB64Json }; // Return resized image
    } catch (error) {
      console.error(
        `Job ID ${job.id} for userId ${userId}, quoteId ${quoteId}: Error during image generation -`,
        error
      );
      let errorMessage = "Image generation failed.";
      if (error instanceof Error) errorMessage = error.message;

      try {
        await db
          .updateTable("generatedImages")
          .set({
            status: "error",
            imageDataUrl: errorMessage.substring(0, 1000),
          })
          .where("quoteId", "=", quoteId)
          .execute();
      } catch (dbError) {
        console.error(
          `Job ID ${job.id} for quoteId ${quoteId}: Failed to update DB status to error -`,
          dbError
        );
      }
      throw new Error(errorMessage);
    }
  },
  {
    connection: redisQueue,
  }
);

console.log(
  `Stylize image worker listening to queue: ${STYLIZE_IMAGE_QUEUE_NAME}`
);
