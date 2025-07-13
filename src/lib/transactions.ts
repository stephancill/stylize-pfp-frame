import { DelegateABI } from "@/abi/DelegateABI";
import { getAddressForUserId } from "@/app/api/generate/route";
import { Hex, parseEventLogs, PublicClient, Transport } from "viem";
import { base } from "viem/chains";
import {
  ROYALTY_PROMPT_AUTHOR_BASIS_POINTS,
  ROYALTY_REFERRER_BASIS_POINTS,
} from "./constants";
import { db } from "./db";

export async function verifyPaymentTransaction({
  transactionHash,
  quoteId,
  publicClient,
  paymentAddress,
  expectedValueWei,
}: {
  transactionHash: Hex;
  quoteId: string;
  publicClient: PublicClient<Transport, typeof base>;
  paymentAddress: Hex;
  expectedValueWei: bigint;
}) {
  let isPaymentVerified = false;
  let verificationError: string | null = null;

  try {
    console.log(
      `Verifying transaction: ${transactionHash} for quoteId: ${quoteId}`
    );

    // 1. Wait for transaction receipt and check status
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: transactionHash,
      confirmations: 1, // Number of block confirmations to wait for
    });

    if (receipt.status !== "success") {
      throw new Error(
        `Transaction ${transactionHash} failed or was reverted. Status: ${receipt.status}`
      );
    }

    const parsedLogs = parseEventLogs({
      abi: DelegateABI,
      logs: receipt.logs,
    });

    // Requires recipient address to have delegated to 0xC7C5B754413A50CB5d8d09FbC11e8092Bf98E246
    const ethReceivedLogs = parsedLogs.filter((log) => {
      return log.eventName === "PaymentReceived";
    });

    if (ethReceivedLogs.length === 0) {
      throw new Error(
        `No ETHReceived logs found for transaction ${transactionHash}`
      );
    }

    const {
      args: { payment },
      address: to,
    } = ethReceivedLogs[0];

    const matchedRecipient = to.toLowerCase() === paymentAddress.toLowerCase();
    const matchedValue = payment.amount >= expectedValueWei;
    const matchedInput = payment.memo === quoteId;

    // Check royalties
    const quote = await db
      .selectFrom("generatedImages")
      .selectAll()
      .where("quoteId", "=", quoteId)
      .executeTakeFirstOrThrow();

    const royalties = await calculateRoyalties({
      prompt: quote.promptText!,
      referringImageId: quote.referringImageId,
    });

    if (matchedRecipient && matchedValue && matchedInput) {
      isPaymentVerified = true;
      console.log(
        `Transaction ${transactionHash} successfully verified for quoteId: ${quoteId}`
      );
    } else {
      verificationError = `Transaction ${transactionHash} does not match the expected values. Recipient\n${to}\n${paymentAddress}\nValue\n${payment.amount}\n${expectedValueWei}\nInput\n${payment.memo}\n${quoteId}`;
    }

    // Check if event royalties match the expected royalties
    for (const royalty of royalties) {
      const matchedRoyalty = payment.royalties.find(
        (r) => r.receiver.toLowerCase() === royalty.receiver.toLowerCase()
      );

      if (!matchedRoyalty) {
        isPaymentVerified = false;
        verificationError = `Transaction ${transactionHash} does not match the expected royalties. Recipient\n${royalty.receiver}\n${matchedRoyalty}\n${royalty.basisPoints}`;
        break;
      }

      if (matchedRoyalty.basisPoints !== royalty.basisPoints) {
        isPaymentVerified = false;
        verificationError = `Transaction ${transactionHash} does not match the expected royalties. Recipient\n${royalty.receiver}\n${matchedRoyalty.basisPoints}\n${royalty.basisPoints}`;
        break;
      }
    }
  } catch (e: any) {
    console.error(
      `Error during on-chain verification for ${transactionHash}:`,
      e
    );
    verificationError = `On-chain verification error: ${e.message}`;
  }

  if (verificationError) {
    throw new Error(verificationError);
  }

  return isPaymentVerified;
}

export async function calculateRoyalties({
  prompt,
  referringImageId,
}: {
  prompt: string;
  referringImageId?: string | null;
}): Promise<{ receiver: `0x${string}`; basisPoints: bigint }[]> {
  const royalties: { receiver: `0x${string}`; basisPoints: bigint }[] = [];

  console.log("Calculating royalties for prompt:", prompt);
  console.log("Referring image ID:", referringImageId);

  if (referringImageId) {
    const referringImage = await db
      .selectFrom("generatedImages")
      .selectAll()
      .where("id", "=", referringImageId)
      .where("status", "=", "completed")
      .executeTakeFirstOrThrow();

    const referrerAddress = await getAddressForUserId(referringImage.userId);

    if (referrerAddress) {
      royalties.push({
        receiver: referrerAddress,
        basisPoints: BigInt(ROYALTY_REFERRER_BASIS_POINTS),
      });
    }
  }

  // Calculate prompt author royalties
  const promptOccurrence = await db
    .selectFrom("generatedImages")
    .selectAll()
    .where("promptText", "=", prompt)
    .where("status", "=", "completed")
    .orderBy("createdAt", "asc")
    .executeTakeFirst();

  if (promptOccurrence) {
    const receiverAddress = await getAddressForUserId(promptOccurrence.userId);

    if (receiverAddress) {
      royalties.push({
        receiver: receiverAddress,
        basisPoints: BigInt(ROYALTY_PROMPT_AUTHOR_BASIS_POINTS),
      });
    }
  }

  return royalties;
}
