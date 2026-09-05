/**
 * Shared configuration for Njia.
 *
 * The "cause" is the concrete need being funded. Keeping it here (rather than a
 * database) keeps the hackathon build simple and fully inspectable. The wallet
 * that receives donations is loaded from env at runtime.
 */

export const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export const ENABLE_CNFT_RECEIPT =
  (process.env.ENABLE_CNFT_RECEIPT ?? "true").toLowerCase() !== "false";

/** The concrete need being funded. One cause per deployment. */
export const CAUSE = {
  title: "Feed 5 kids lunch",
  organization: "Njia Community Kitchen",
  description:
    "One tap funds a school lunch on Solana devnet. Every gift mints you a " +
    "compressed-NFT thank-you receipt, verifiable on-chain.",
  /** Funding goal, in SOL. */
  goalSol: 5,
  /** Preset donation buttons, in SOL. */
  presets: [0.1, 0.5, 1],
} as const;

/** Absolute URL to the cause icon (must be absolute for the Actions spec). */
export function iconUrl(): string {
  return `${BASE_URL}/njia-icon.svg`;
}
