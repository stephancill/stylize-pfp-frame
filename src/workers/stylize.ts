import { Worker } from "bullmq";
import { STYLIZE_IMAGE_QUEUE_NAME } from "../lib/constants";
import { redisQueue } from "../lib/redis";
import { StylizeImageJobData } from "../types/jobs";
import OpenAI, { toFile } from "openai"; // Using the official OpenAI SDK

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
    const {
      fid,
      prompt: basePrompt,
      userPfpUrl,
      n = 1,
      size = "256x256",
    } = job.data;

    if (!userPfpUrl) {
      console.error(
        `Job ID ${job.id} for fid ${fid}: Missing userPfpUrl. Cannot use image edit without an input image.`
      );
      throw new Error("userPfpUrl is required for image editing.");
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
      `Processing DALL-E 2 image edit job for fid: ${fid} with base prompt: "${basePrompt}" and PFP URL: ${userPfpUrl}`
    );
    console.log(`Generated DALL-E 2 Edit Prompt: ${editPrompt}`);

    try {
      // 1. Fetch the user's PFP
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
      });

      // Check if response.data exists
      if (!response.data) {
        throw new Error("No image data received from OpenAI API after edit.");
      }

      const jsons = response.data.map((img) => img.b64_json);

      console.log("done");

      // Decode the base64 json
      const images = jsons.map((json) => {
        const image = Buffer.from(json!, "base64");
        return image;
      });

      console.log(
        "generated",
        images.map((image) => Object.keys(image))
      );

      // TODO: What to do with the generated images? (Save URLs, notify user, etc.)
      return { jsons };
    } catch (error) {
      console.error(
        `Job ID ${job.id} for fid ${fid}: Error during DALL-E 2 image edit -`,
        error
      );
      let errorMessage = "Image editing failed.";
      if (error instanceof Error) errorMessage = error.message;
      // Check for OpenAI specific API errors if possible
      // if (error.response) { console.error(error.response.data); }
      throw new Error(errorMessage);
    }
  },
  {
    connection: redisQueue,
  }
);

console.log(
  `Stylize image worker (using DALL-E 2 edit) listening to queue: ${STYLIZE_IMAGE_QUEUE_NAME}`
);
