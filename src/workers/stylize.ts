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
    const { fid, prompt, userPfpUrl, quoteId, n = 1 } = job.data;

    if (!userPfpUrl) {
      console.error(
        `Job ID ${job.id} for fid ${fid}, quoteId ${quoteId}: Missing userPfpUrl. Cannot use image edit without an input image.`
      );
      await db
        .updateTable("generatedImages")
        .set({ status: "error", imageDataUrl: "Missing userPfpUrl for worker" })
        .where("quoteId", "=", quoteId)
        .execute();
      throw new Error("userPfpUrl is required for image editing.");
    }
    if (!quoteId) {
      console.error(
        `Job ID ${job.id} for fid ${fid}: Missing quoteId. Cannot update database record.`
      );
      throw new Error("quoteId is required to update the database.");
    }

    console.log(
      `Processing image model image edit job for fid: ${fid}, quoteId: ${quoteId} with prompt: "${prompt}" and PFP URL: ${userPfpUrl}`
    );

    try {
      const imageResponse = await fetch(userPfpUrl);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to fetch image from ${userPfpUrl}: ${imageResponse.statusText}`
        );
      }
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const imageFile = await toFile(imageBuffer, "profile.png", {
        type: imageResponse.headers.get("content-type") || "image/png",
      });

      const response = await openaiClient.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: prompt,
        n: n, // Number of images to generate
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

      const firstImageB64Json = response.data[0].b64_json;

      // Convert base64 to buffer
      const generatedImageBuffer = Buffer.from(firstImageB64Json, "base64");

      // Resize image
      const resizedImageBuffer = await sharp(generatedImageBuffer)
        .resize(250, 250)
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
        // Notify the user that the image has been edited
        await sendFrameNotification({
          fid,
          title: "Stylize complete",
          body: "Your profile picture has been stylized",
          targetUrl: process.env.APP_URL,
        });
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
        `Job ID ${job.id} for fid ${fid}, quoteId ${quoteId}: Error during image model image edit -`,
        error
      );
      let errorMessage = "Image editing failed.";
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
