import { DelegateABI } from "@/abi/DelegateABI";
import { db } from "@/lib/db";
import { getAddressForFid } from "@/lib/farcaster";
import { publicClient } from "@/lib/public-client";
import { stylizeImageQueue } from "@/lib/queue";
import {
  calculateRoyalties,
  verifyPaymentTransaction,
} from "@/lib/transactions";
import { StylizeImageJobData } from "@/types/jobs";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { encodeFunctionData, Hex, isHex, parseEther } from "viem";

// Environment variables for payment
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS! as Hex;
const AMOUNT_DUE_ETH_STRING = process.env.PAYMENT_AMOUNT || "0.00001";
const EXPECTED_VALUE_WEI = parseEther(AMOUNT_DUE_ETH_STRING);

export async function POST(request: Request) {
  try {
    const body = await request.json();

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

      // Get the generation ID from the database
      const generationRecord = await db
        .selectFrom("generatedImages")
        .select("id")
        .where("quoteId", "=", generationRequest.quoteId)
        .executeTakeFirst();

      if (!generationRecord) {
        console.error(
          "Critical error: Could not find generation record for quoteId:",
          generationRequest.quoteId
        );
        await db
          .updateTable("generatedImages")
          .set({ status: "error" })
          .where("quoteId", "=", generationRequest.quoteId)
          .execute();
        return NextResponse.json(
          { error: "Internal error: Could not find generation record." },
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
        generationId: generationRecord.id, // Add the actual generation ID
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
        referringImageId,
      } = body as Partial<
        StylizeImageJobData & {
          prompt: string;
          userId: string;
          userPfpUrl?: string;
          referringImageId?: string;
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

      const royalties = await calculateRoyalties({
        prompt,
        referringImageId,
      });

      const insertedRecord = await db
        .insertInto("generatedImages")
        .values({
          userId: userId,
          promptText: prompt.trim(),
          quoteId: newQuoteId,
          status: "pending_payment",
          userPfpUrl: userPfpUrl,
          referringImageId,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      const calldata = encodeFunctionData({
        abi: DelegateABI,
        functionName: "pay",
        args: [newQuoteId, royalties],
      });

      return NextResponse.json({
        message: "Generation quote created. Please proceed with payment.",
        quoteId: newQuoteId,
        paymentAddress: PAYMENT_ADDRESS,
        amountDue: AMOUNT_DUE_ETH_STRING,
        calldata,
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

export async function getAddressForUserId(
  userId: string
): Promise<`0x${string}` | null> {
  if (isHex(userId)) {
    return userId as `0x${string}`;
  } else {
    return getAddressForFid(Number(userId));
  }
}
