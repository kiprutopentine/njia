/**
 * In-memory store of donation receipts for the live page.
 *
 * A hackathon-scoped store: it holds the most recent donations so the live
 * page can show a "wall of receipts" without a database. On-chain data is the
 * real source of truth (transfer tx + cNFT); this is a convenience cache. It
 * resets on server restart, which is fine for a demo.
 */

export interface Receipt {
  /** Giver's wallet address (base58). */
  giver: string;
  /** Amount donated, in SOL. */
  amountSol: number;
  /** Transfer transaction signature. */
  transferSig: string;
  /** cNFT mint transaction signature, if the receipt minted. */
  cnftSig?: string;
  /** cNFT asset id (leaf), if available. */
  assetId?: string;
  /** Unix ms timestamp. */
  at: number;
}

// Use a module-level global so the store survives Next.js hot reloads in dev.
const g = globalThis as unknown as { __njiaReceipts?: Receipt[] };
if (!g.__njiaReceipts) g.__njiaReceipts = [];

export function addReceipt(r: Receipt): void {
  g.__njiaReceipts!.unshift(r);
  // Keep the list bounded.
  if (g.__njiaReceipts!.length > 100) g.__njiaReceipts!.length = 100;
}

export function getReceipts(): Receipt[] {
  return g.__njiaReceipts!;
}

export function totalRaisedSol(): number {
  return g.__njiaReceipts!.reduce((sum, r) => sum + r.amountSol, 0);
}
