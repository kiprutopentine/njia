/**
 * One-time setup: create the Merkle tree that holds receipt cNFTs.
 * Usage: npx tsx scripts/setup-tree.ts
 *
 * Requires CAUSE_WALLET_SECRET in .env and the cause wallet to hold devnet SOL.
 * Prints the tree address to paste into .env as CNFT_TREE_ADDRESS.
 */
import { config } from "dotenv";
import { createReceiptTree } from "../src/lib/cnft";
import { getConnection, getCausePublicKey } from "../src/lib/solana";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

config();

async function main() {
  const conn = getConnection();
  const pk = getCausePublicKey();
  const bal = await conn.getBalance(pk);
  console.log("Cause wallet:", pk.toBase58());
  console.log("Balance:", bal / LAMPORTS_PER_SOL, "SOL");
  if (bal === 0) {
    console.error(
      "\nCause wallet has 0 SOL. Fund it first (npx tsx scripts/airdrop.ts " +
        "or https://faucet.solana.com), then re-run.",
    );
    process.exit(1);
  }

  console.log("\nCreating Merkle tree for receipts (this can take ~15s)...");
  const tree = await createReceiptTree();
  console.log("\nTree created!");
  console.log("Tree address:", tree);
  console.log(
    "Explorer:",
    `https://explorer.solana.com/address/${tree}?cluster=devnet`,
  );
  console.log("\nAdd to .env:  CNFT_TREE_ADDRESS=" + tree + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
