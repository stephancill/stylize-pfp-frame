import { Worker } from "bullmq";
import { STYLIZE_IMAGE_QUEUE_NAME } from "../lib/constants";
import { redisQueue } from "../lib/redis";
import { StylizeImageJobData } from "../types/jobs";
import OpenAI, { toFile } from "openai"; // Using the official OpenAI SDK
import { db } from "@/lib/db";
import { notifyUsers, sendFrameNotification } from "@/lib/notifications";

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
    const { fid, prompt: basePrompt, userPfpUrl, quoteId, n = 1 } = job.data;

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

    // Construct the detailed prompt for DALL-E 2 edit operation
    const editPrompt = `Edit the provided profile picture based on the theme: "${basePrompt}".

Instructions for the edit:
1. Main Subject: The subject is the animal or creature already in the provided image. Adapt it to be representative of the character or vibe suggested by the theme.
2. Depiction: Modify the existing animal/creature. If it was wearing clothes, try to match the new style closely. Otherwise, give the animal a minimalist outfit suitable for the new theme.
3. Visual Style: The image must be transformed to have a high grain effect, 90s disposable camera style with chromatic aberration, a slight yellow tint, and be a hyper-realistic photograph with detailed elements. It should be captured in a harsh flash photography style, evoking a vintage paparazzi feel.
4. Color Preservation: If possible, try to preserve prominent colors from the original image while applying the new style.

Ensure the final image is suitable as a profile picture.`;

    console.log(
      `Processing DALL-E 2 image edit job for fid: ${fid}, quoteId: ${quoteId} with base prompt: "${basePrompt}" and PFP URL: ${userPfpUrl}`
    );
    console.log(`Generated DALL-E 2 Edit Prompt: ${editPrompt}`);

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
        prompt: editPrompt,
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

      await db
        .updateTable("generatedImages")
        .set({
          status: "completed",
          imageDataUrl: `data:image/png;base64,${firstImageB64Json}`,
        })
        .where("quoteId", "=", quoteId)
        .execute();

      // Notify the user that the image has been edited
      await sendFrameNotification({
        fid,
        title: "Stylize complete",
        body: "Your profile picture has been stylized",
        targetUrl: process.env.APP_URL,
      });

      console.log(
        `Job ID ${job.id} for quoteId ${quoteId} completed. Image saved to DB.`
      );
      return { b64JsonImage: firstImageB64Json };
    } catch (error) {
      console.error(
        `Job ID ${job.id} for fid ${fid}, quoteId ${quoteId}: Error during DALL-E 2 image edit -`,
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
  `Stylize image worker (using DALL-E) listening to queue: ${STYLIZE_IMAGE_QUEUE_NAME}`
);
