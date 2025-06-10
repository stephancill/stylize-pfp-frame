import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stylizeImageQueue } from "@/lib/queue";
import { StylizeImageJobData } from "@/types/jobs";
import { randomUUID } from "crypto";
import { createPublicClient, http, parseEther, Hex, toHex } from "viem";
import { base } from "viem/chains"; // Assuming Ethereum Mainnet. Change if using a different chain.
import { verifyPaymentTransaction } from "@/lib/transactions";

// Environment variables for payment
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS! as Hex;
const AMOUNT_DUE_ETH_STRING = process.env.PAYMENT_AMOUNT || "0.00001";
const EXPECTED_VALUE_WEI = parseEther(AMOUNT_DUE_ETH_STRING);

// Initialize Viem Public Client
const publicClient = createPublicClient({
  chain: base as any,
  transport: http(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("body", body);

    if (body.quoteId && body.transactionHash) {
      // --- PAYMENT SUBMISSION FLOW ---
      const { quoteId, transactionHash } = body as {
        quoteId: string;
        transactionHash: Hex; // Ensure tx hash is treated as Hex
      };

      if (!quoteId || !transactionHash) {
        return NextResponse.json(
          {
            error:
              "quoteId and transactionHash are required for payment submission",
          },
          { status: 400 }
        );
      }

      const generationRequest = await db
        .selectFrom("generatedImages")
        .selectAll()
        .where("quoteId", "=", quoteId)
        .executeTakeFirst();

      if (!generationRequest) {
        return NextResponse.json(
          { error: "Invalid quoteId. Request not found." },
          { status: 404 }
        );
      }

      if (generationRequest.status !== "pending_payment") {
        return NextResponse.json(
          {
            error: `Request status is '${generationRequest.status}', not 'pending_payment'. Payment cannot be processed.`,
          },
          { status: 409 }
        );
      }

      let isPaymentVerified = false;
      let verificationError = "Payment verification failed.";

      try {
        console.log(
          `Verifying transaction: ${transactionHash} for quoteId: ${quoteId}`
        );

        const publicClient = createPublicClient({
          chain: base,
          transport: http(),
        });

        isPaymentVerified = await verifyPaymentTransaction({
          transactionHash,
          quoteId,
          publicClient,
          paymentAddress: PAYMENT_ADDRESS,
          expectedValueWei: EXPECTED_VALUE_WEI,
        });
      } catch (e: any) {
        console.error(
          `Error during on-chain verification for ${transactionHash}:`,
          e
        );
        verificationError = `On-chain verification error: ${e.message}`;
      }

      if (!isPaymentVerified) {
        await db
          .updateTable("generatedImages")
          .set({ status: "payment_error", transactionHash: transactionHash })
          .where("quoteId", "=", quoteId)
          .execute();
        return NextResponse.json({ error: verificationError }, { status: 402 });
      }

      // 3. If verification successful, update DB and queue the job
      await db
        .updateTable("generatedImages")
        .set({ status: "queued", transactionHash: transactionHash })
        .where("quoteId", "=", quoteId)
        .execute();

      // Construct jobData from the stored request
      // Assuming promptText, userId are stored. Others like userPfpUrl might also be stored or passed differently.
      if (
        !generationRequest.promptText ||
        typeof generationRequest.userId !== "string" ||
        generationRequest.userPfpUrl === undefined
      ) {
        console.error(
          "Critical data missing from generationRequest for job queuing",
          generationRequest
        );
        // Update status to error if critical data for job is missing
        await db
          .updateTable("generatedImages")
          .set({ status: "error" })
          .where("quoteId", "=", quoteId)
          .execute();
        return NextResponse.json(
          { error: "Internal error: Missing data to queue job after payment." },
          { status: 500 }
        );
      }

      const jobData: StylizeImageJobData = {
        userId: generationRequest.userId,
        prompt: generationRequest.promptText,
        userPfpUrl:
          generationRequest.userPfpUrl === null
            ? undefined
            : generationRequest.userPfpUrl, // Convert null to undefined
        quoteId: generationRequest.quoteId, // Add quoteId to job data
      };

      const job = await stylizeImageQueue.add("stylizeImage", jobData);
      console.log(
        `Payment verified for quote ${quoteId}. Job added to queue with ID: ${job.id}`
      );

      return NextResponse.json({
        message:
          "Payment verified and image generation job queued successfully!",
        jobId: job.id,
      });
    } else {
      // --- INITIAL QUOTE REQUEST FLOW ---
      const {
        userId,
        prompt,
        userPfpUrl, // Now expecting this from the client
      } = body as Partial<
        StylizeImageJobData & {
          prompt: string;
          userId: string;
          userPfpUrl?: string;
        }
      >;

      if (!userId || typeof userId !== "string") {
        return NextResponse.json(
          { error: "Valid userId (string) is required for a quote" },
          { status: 400 }
        );
      }
      if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
        return NextResponse.json(
          { error: "A non-empty prompt is required for a quote" },
          { status: 400 }
        );
      }
      if (!PAYMENT_ADDRESS) {
        console.error("PAYMENT_ADDRESS environment variable is not set.");
        return NextResponse.json(
          { error: "Server configuration error: Payment address not set." },
          { status: 500 }
        );
      }

      const newQuoteId = randomUUID();

      await db
        .insertInto("generatedImages")
        .values({
          userId: userId,
          promptText: prompt,
          quoteId: newQuoteId,
          status: "pending_payment",
          userPfpUrl: userPfpUrl, // Store userPfpUrl
        })
        .executeTakeFirstOrThrow(); // Ensures insert happens

      return NextResponse.json({
        message: "Generation quote created. Please proceed with payment.",
        quoteId: newQuoteId,
        paymentAddress: PAYMENT_ADDRESS,
        amountDue: AMOUNT_DUE_ETH_STRING, // Send the string representation for display
        calldata: toHex(newQuoteId),
      });
    }
  } catch (error) {
    console.error("Error in /api/generate POST handler:", error);
    let errorMessage = "Internal Server Error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    if (error instanceof SyntaxError && errorMessage.includes("JSON")) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    // Handle potential Kysely unique constraint errors for quoteId (very unlikely with UUIDs)
    if (
      errorMessage.toLowerCase().includes("unique constraint") &&
      errorMessage.toLowerCase().includes("quoteid")
    ) {
      return NextResponse.json(
        { error: "Failed to generate a unique quote ID. Please try again." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Optional: Implement GET or other methods if needed
// export async function GET(request: Request) {
//   return NextResponse.json({ message: "This is the generate API. Use POST to submit a job." });
// }
