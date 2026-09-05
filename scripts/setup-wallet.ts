/**
 * One-time setup: generate the cause/treasury wallet and airdrop devnet SOL.
 *
 * Usage: pnpm setup:wallet
 *
 * Prints a base58 secret key to paste into .env as CAUSE_WALLET_SECRET.
 * The secret is printed to stdout only, never written to a tracked file.
 */
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";

const RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const wallet = Keypair.generate();

  console.log("\n=== Njia cause wallet ===");
  console.log("Public key:  ", wallet.publicKey.toBase58());
  console.log("Secret (b58):", bs58.encode(wallet.secretKey));

  console.log("\nRequesting 2 SOL devnet airdrop...");
  try {
    const sig = await connection.requestAirdrop(
      wallet.publicKey,
      2 * LAMPORTS_PER_SOL,
    );
    const bh = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      { signature: sig, ...bh },
      "confirmed",
    );
    const bal = await connection.getBalance(wallet.publicKey);
    console.log(`Airdrop confirmed. Balance: ${bal / LAMPORTS_PER_SOL} SOL`);
    console.log("Airdrop tx:", `https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  } catch (err) {
    console.warn(
      "\nAirdrop failed (devnet faucet is often rate-limited). " +
        "Fund manually via https://faucet.solana.com using the public key above.",
    );
    console.warn("Error:", (err as Error).message);
  }

  console.log("\nNext steps:");
  console.log("1. Copy the secret into .env as CAUSE_WALLET_SECRET=");
  console.log("2. Run: pnpm setup:tree\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
