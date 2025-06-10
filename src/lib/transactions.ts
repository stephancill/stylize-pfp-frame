import {
  Hex,
  parseAbi,
  parseEventLogs,
  PublicClient,
  toHex,
  Transport,
} from "viem";
import { base } from "viem/chains";

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
      abi: parseAbi([
        "event ETHReceived(address indexed from, uint256 indexed amount, bytes data)",
      ]),
      logs: receipt.logs,
    });

    console.log(parsedLogs);

    // Requires recipient address to have delegated to 0x1691F3f170D0652A4c208882D01b638cD14739C8
    const ethReceivedLogs = parsedLogs.filter((log) => {
      return log.eventName === "ETHReceived";
    });

    if (ethReceivedLogs.length === 0) {
      throw new Error(
        `No ETHReceived logs found for transaction ${transactionHash}`
      );
    }

    const {
      args: { data, amount },
      address: to,
    } = ethReceivedLogs[0];

    const matchedRecipient = to.toLowerCase() === paymentAddress.toLowerCase();
    const matchedValue = amount >= expectedValueWei;
    const matchedInput = data === toHex(quoteId);

    if (matchedRecipient && matchedValue && matchedInput) {
      isPaymentVerified = true;
      console.log(
        `Transaction ${transactionHash} successfully verified for quoteId: ${quoteId}`
      );
    } else {
      verificationError = `Transaction ${transactionHash} does not match the expected values. Recipient\n${to}\n${paymentAddress}\nValue\n${amount}\n${expectedValueWei}\nInput\n${data}\n${toHex(
        quoteId
      )}`;
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
