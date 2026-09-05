import { getReceipts, totalRaisedSol } from "@/lib/receipts";
import { getCachedOnchainFeed } from "@/lib/onchain";
import { CAUSE } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Feed for the live page.
 *
 * On-chain data is the source of truth: totals and the list of gifts are read
 * from the cause wallet's transaction history (cached briefly to respect RPC
 * limits), so the page is correct after restarts and across serverless
 * instances. Each gift is enriched with the cNFT receipt details (mint
 * signature + asset id) from the in-memory store when available. If the RPC
 * read fails entirely, we fall back to the in-memory store so the page still
 * shows recent activity.
 */
export const GET = async () => {
  const mem = getReceipts();
  const memByTransfer = new Map(mem.map((r) => [r.transferSig, r]));

  let onchain;
  try {
    onchain = await getCachedOnchainFeed(25);
  } catch {
    onchain = null;
  }

  if (!onchain || onchain.receipts.length === 0) {
    // Fallback: use the in-memory store (may be partial on serverless, but
    // better than an empty page if the RPC is unavailable).
    return Response.json({
      cause: causePayload(),
      totalRaisedSol: onchain?.totalRaisedSol || totalRaisedSol(),
      receipts: mem.map((r) => ({
        giver: r.giver,
        amountSol: r.amountSol,
        transferSig: r.transferSig,
        at: r.at,
        cnftSig: r.cnftSig,
        assetId: r.assetId,
      })),
    });
  }

  const receipts = onchain.receipts.map((r) => {
    const enriched = memByTransfer.get(r.transferSig);
    return {
      giver: r.giver,
      amountSol: r.amountSol,
      transferSig: r.transferSig,
      at: r.at ? r.at * 1000 : Date.now(),
      cnftSig: enriched?.cnftSig,
      assetId: enriched?.assetId,
    };
  });

  return Response.json({
    cause: causePayload(),
    totalRaisedSol: onchain.totalRaisedSol,
    receipts,
  });
};

function causePayload() {
  return {
    title: CAUSE.title,
    organization: CAUSE.organization,
    goalSol: CAUSE.goalSol,
  };
}
