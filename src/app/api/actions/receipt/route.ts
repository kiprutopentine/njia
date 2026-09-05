import {
  CompletedAction,
  NextActionPostRequest,
  createActionHeaders,
} from "@solana/actions";
import { CAUSE, iconUrl, ENABLE_CNFT_RECEIPT } from "@/lib/config";
import { addReceipt } from "@/lib/receipts";
import { mintReceipt } from "@/lib/cnft";

const headers = createActionHeaders();

export const OPTIONS = async () => new Response(null, { headers });

/**
 * Chained "next" action. Called by the blink client after the donation
 * transfer confirms on-chain. Body includes the transfer `signature` and the
 * giver's `account`. We mint the cNFT receipt here and return a completed
 * state describing the thank-you.
 */
export const POST = async (req: Request) => {
  const url = new URL(req.url);
  const amount = Number(url.searchParams.get("amount") ?? "0");

  let body: NextActionPostRequest;
  try {
    body = await req.json();
  } catch {
    body = {} as NextActionPostRequest;
  }

  const transferSig = body.signature ?? "";
  const giver = body.account ?? "";

  let receiptLine = "Your gift is confirmed on-chain.";
  let cnftSig: string | undefined;
  let assetId: string | undefined;

  if (ENABLE_CNFT_RECEIPT && giver && transferSig) {
    try {
      const result = await mintReceipt({ giver, amountSol: amount, transferSig });
      cnftSig = result.cnftSig;
      assetId = result.assetId;
      receiptLine = "A compressed-NFT receipt was minted to your wallet.";
    } catch (err) {
      console.error("cNFT mint failed (non-fatal):", err);
      receiptLine =
        "Your gift is confirmed. (Receipt mint is temporarily unavailable.)";
    }
  }

  // Record for the live page (on-chain data remains the source of truth).
  if (giver && transferSig) {
    addReceipt({
      giver,
      amountSol: amount,
      transferSig,
      cnftSig,
      assetId,
      at: Date.now(),
    });
  }

  const payload: CompletedAction = {
    type: "completed",
    title: "Thank you for giving 🌱",
    icon: iconUrl(),
    label: "Gift complete",
    description:
      `You gave ${amount} SOL to ${CAUSE.title}. ${receiptLine}` +
      (assetId ? `\n\nReceipt asset: ${assetId}` : ""),
  };

  return Response.json(payload, { headers });
};
