import { SOLANA_RPC_URL } from "@/lib/config";
import { readOnchainFeed } from "@/lib/onchain";

export const dynamic = "force-dynamic";

/** TEMP diagnostic. Remove before final submission. */
export const GET = async () => {
  const host = (() => {
    try {
      return new URL(SOLANA_RPC_URL).host;
    } catch {
      return "invalid";
    }
  })();
  const hasKey = /[?&]api-key=/.test(SOLANA_RPC_URL);

  let feedResult: unknown;
  let error: string | null = null;
  try {
    feedResult = await readOnchainFeed(15);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return Response.json({ rpcHost: host, hasApiKey: hasKey, error, feedResult });
};
