import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import bs58 from "bs58";
import { SOLANA_RPC_URL } from "./config";

let connection: Connection | null = null;

/** Singleton devnet connection. */
export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(SOLANA_RPC_URL, "confirmed");
  }
  return connection;
}

/**
 * Load the cause/treasury wallet from env.
 *
 * Accepts either a base58-encoded secret key (from `pnpm setup:wallet`) or a
 * JSON byte array (the format `solana-keygen` writes). Throws a clear error if
 * unset so misconfiguration fails loudly rather than silently.
 */
export function getCauseWallet(): Keypair {
  const secret = process.env.CAUSE_WALLET_SECRET;
  if (!secret) {
    throw new Error(
      "CAUSE_WALLET_SECRET is not set. Run `pnpm setup:wallet` and copy the " +
        "value into .env",
    );
  }
  const trimmed = secret.trim();
  if (trimmed.startsWith("[")) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed)));
  }
  return Keypair.fromSecretKey(bs58.decode(trimmed));
}

export function getCausePublicKey(): PublicKey {
  return getCauseWallet().publicKey;
}
