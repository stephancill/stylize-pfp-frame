import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

// Placeholder for the actual payment address, should be from environment variables
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS!;
// Placeholder for the amount due, can be dynamic later
const AMOUNT_DUE = process.env.PAYMENT_AMOUNT || "0.0001";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fid, prompt } = body;

    if (!fid || typeof fid !== "number") {
      return NextResponse.json(
        { error: "Valid FID is required" },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return NextResponse.json(
        { error: "A non-empty prompt is required" },
        { status: 400 }
      );
    }

    if (!PAYMENT_ADDRESS || PAYMENT_ADDRESS === "YOUR_PAYMENT_ADDRESS_HERE") {
      console.error("PAYMENT_ADDRESS environment variable is not set.");
      return NextResponse.json(
        { error: "Server configuration error: Payment address not set." },
        { status: 500 }
      );
    }

    const quoteId = randomUUID();

    const newGenerationRequest = await db
      .insertInto("generatedImages")
      .values({
        fid: fid,
        promptText: prompt,
        quoteId: quoteId,
        status: "pending_payment",
        // transactionHash, imageDataUrl will be null by default or upon creation
      })
      .returning(["id", "quoteId", "createdAt"])
      .executeTakeFirstOrThrow();

    return NextResponse.json({
      message: "Generation request created. Please proceed with payment.",
      quoteId: newGenerationRequest.quoteId,
      paymentAddress: PAYMENT_ADDRESS,
      amountDue: AMOUNT_DUE,
    });
  } catch (error) {
    console.error("Error creating generation request:", error);
    let errorMessage = "Failed to create generation request.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // For Prisma-like unique constraint errors, Kysely might throw a more generic DB error.
    // You might need to check error codes or messages if a specific error for unique constraints is needed.
    if (
      errorMessage.includes("unique constraint") &&
      errorMessage.includes("quoteId")
    ) {
      // This case is unlikely with UUIDs but good for robustness
      return NextResponse.json(
        { error: "Failed to generate a unique quote ID. Please try again." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
