import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import { getConnection, getCausePublicKey } from "./solana";
import { SOLANA_RPC_URL } from "./config";

/**
 * A donation reconstructed from on-chain data. This is the source of truth for
 * the live page: it reads the cause wallet's transaction history rather than
 * any in-memory cache, so it survives restarts and works across serverless
 * instances.
 */
export interface OnchainReceipt {
  giver: string;
  amountSol: number;
  transferSig: string;
  at: number | null;
  memo?: string;
}

export interface OnchainFeed {
  totalRaisedSol: number;
  receipts: OnchainReceipt[];
}

// Short-lived cache so the live page polling doesn't hammer the RPC.
const g = globalThis as unknown as {
  __njiaOnchainCache?: { at: number; feed: OnchainFeed };
};
const CACHE_TTL_MS = 12_000;

function heliusApiKey(): string | null {
  const m = SOLANA_RPC_URL.match(/[?&]api-key=([^&]+)/);
  return m ? m[1] : null;
}

/**
 * Read gifts using the Helius Enhanced Transactions REST API. This is a single
 * HTTP call (not a JSON-RPC batch), so it works on the Helius free tier where
 * batch RPC is blocked. Returns null if not on Helius so the caller can fall
 * back to the standard RPC path.
 */
async function readViaHelius(limit: number): Promise<OnchainFeed | null> {
  const key = heliusApiKey();
  if (!key) return null;
  const cause = getCausePublicKey().toBase58();
  const url = `https://api-devnet.helius.xyz/v0/addresses/${cause}/transactions?api-key=${key}&limit=${limit}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Helius API ${res.status}`);
  const data = (await res.json()) as HeliusTx[];

  const receipts: OnchainReceipt[] = [];
  for (const tx of data) {
    if (tx.transactionError) continue;
    // Find a native SOL transfer landing on the cause wallet.
    const inbound = (tx.nativeTransfers ?? []).find(
      (t) => t.toUserAccount === cause && t.amount > 0,
    );
    if (!inbound) continue;

    // Njia gifts carry a memo starting with "Njia gift". Requiring it excludes
    // airdrops and unrelated inbound transfers.
    const memo = extractMemo(tx);
    if (!memo || !memo.startsWith("Njia gift")) continue;

    receipts.push({
      giver: tx.feePayer ?? inbound.fromUserAccount ?? "unknown",
      amountSol: inbound.amount / LAMPORTS_PER_SOL,
      transferSig: tx.signature,
      at: tx.timestamp ?? null,
      memo,
    });
  }

  const totalRaisedSol = receipts.reduce((s, r) => s + r.amountSol, 0);
  return { totalRaisedSol, receipts };
}

function extractMemo(tx: HeliusTx): string | undefined {
  // Helius returns the memo as a Memo-program instruction whose `data` field is
  // the base58-encoded UTF-8 memo bytes.
  const memoIx = (tx.instructions ?? []).find((i) =>
    i.programId?.startsWith("Memo"),
  );
  if (memoIx?.data) {
    try {
      return Buffer.from(bs58.decode(memoIx.data)).toString("utf8");
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Standard-RPC fallback (used when not on Helius). Fetches transactions one at
 * a time to avoid batch-request limits.
 */
async function readViaRpc(limit: number): Promise<OnchainFeed> {
  const connection = getConnection();
  const cause = getCausePublicKey();
  const sigInfos = await connection.getSignaturesForAddress(cause, { limit });

  const receipts: OnchainReceipt[] = [];
  for (const info of sigInfos) {
    const tx = await connection.getParsedTransaction(info.signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx || tx.meta?.err || !tx.meta) continue;
    const keys = tx.transaction.message.accountKeys.map((k) =>
      k.pubkey.toBase58(),
    );
    const idx = keys.indexOf(cause.toBase58());
    if (idx < 0) continue;
    const delta =
      (tx.meta.postBalances[idx] ?? 0) - (tx.meta.preBalances[idx] ?? 0);
    if (delta <= 0) continue;
    const logs = tx.meta.logMessages ?? [];
    const memoLog = logs.find((l) => l.includes("Program log: Memo"));
    let memo: string | undefined;
    if (memoLog) {
      const m = memoLog.match(/"([^"]*)"/);
      if (m) memo = m[1];
    }
    if (!memo || !memo.startsWith("Njia gift")) continue;
    receipts.push({
      giver: keys[0] ?? "unknown",
      amountSol: delta / LAMPORTS_PER_SOL,
      transferSig: info.signature,
      at: info.blockTime ?? null,
      memo,
    });
  }
  const totalRaisedSol = receipts.reduce((s, r) => s + r.amountSol, 0);
  return { totalRaisedSol, receipts };
}

export async function readOnchainFeed(limit = 25): Promise<OnchainFeed> {
  const viaHelius = await readViaHelius(limit);
  if (viaHelius) return viaHelius;
  return readViaRpc(limit);
}

/**
 * Cached wrapper. Returns the cached feed if fresh; otherwise refreshes. On RPC
 * failure, returns the last good cache (or throws if none) so the page never
 * breaks under transient errors.
 */
export async function getCachedOnchainFeed(limit = 25): Promise<OnchainFeed> {
  const now = Date.now();
  const cached = g.__njiaOnchainCache;
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.feed;
  try {
    const feed = await readOnchainFeed(limit);
    g.__njiaOnchainCache = { at: now, feed };
    return feed;
  } catch (err) {
    if (cached) return cached.feed;
    throw err;
  }
}

// Minimal shape of the Helius Enhanced Transaction we use.
interface HeliusTx {
  signature: string;
  timestamp?: number;
  feePayer?: string;
  transactionError?: unknown;
  nativeTransfers?: {
    fromUserAccount?: string;
    toUserAccount?: string;
    amount: number;
  }[];
  instructions?: { programId?: string; data?: string }[];
}
