import { verifyPaymentTransaction } from "@/lib/transactions";
import { createPublicClient, http, parseEther } from "viem";
import { base } from "viem/chains";

const valid = await verifyPaymentTransaction({
  expectedValueWei: parseEther("0.000001"),
  paymentAddress: "0x94F7a1573dF1DCBFF0eE78DD3e2CbfF161997Ad9",
  publicClient: createPublicClient({
    chain: base,
    transport: http(),
  }),
  quoteId: "f25d99e0-4345-432d-9de3-f60a825c993d",
  transactionHash:
    "0x840b1e1e716bcfb8488901f5f8f60921ca8c5453addb9f88820d05781d7285a2",
});

console.log(valid);
