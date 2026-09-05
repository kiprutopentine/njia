/**
 * End-to-end test of the full Njia flow on devnet.
 * Usage: npx tsx scripts/e2e-test.ts [amountSol]
 *
 * Simulates a giver:
 *   1. GET the Action metadata
 *   2. POST to get the transfer transaction
 *   3. sign + send it on devnet (giver pays)
 *   4. POST the chained receipt action -> cNFT mint
 *
 * Requires:
 *   - dev server running (BASE_URL, default http://localhost:3100)
 *   - a funded GIVER wallet (env GIVER_SECRET, base58) OR it generates one and
 *     asks you to fund it
 *   - cause wallet + tree configured for the cNFT step
 */
import {
  Connection,
  Keypair,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import { config } from "dotenv";

config();

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const amountSol = Number(process.argv[2] ?? "0.05");

async function main() {
  const conn = new Connection(RPC, "confirmed");

  // Load or create the giver.
  let giver: Keypair;
  if (process.env.GIVER_SECRET) {
    giver = Keypair.fromSecretKey(bs58.decode(process.env.GIVER_SECRET.trim()));
  } else {
    giver = Keypair.generate();
    console.log("Generated giver:", giver.publicKey.toBase58());
    console.log("Giver secret (b58):", bs58.encode(giver.secretKey));
  }

  const bal = await conn.getBalance(giver.publicKey);
  console.log("Giver balance:", bal / LAMPORTS_PER_SOL, "SOL");
  if (bal < amountSol * LAMPORTS_PER_SOL + 5000) {
    console.error(
      `\nGiver needs at least ${amountSol} SOL (+fees). Fund ${giver.publicKey.toBase58()} then re-run with GIVER_SECRET set.`,
    );
    process.exit(1);
  }

  // 1. GET metadata
  const meta = await (await fetch(`${BASE}/api/actions/donate`)).json();
  console.log("\n[1] Action title:", meta.title);

  // 2. POST for the transfer transaction
  const postRes = await fetch(`${BASE}/api/actions/donate?amount=${amountSol}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account: giver.publicKey.toBase58() }),
  });
  const post = await postRes.json();
  if (!post.transaction) throw new Error("No transaction returned: " + JSON.stringify(post));
  console.log("[2] Got transfer tx. Next action:", post.links?.next?.href);

  // 3. sign + send
  const tx = Transaction.from(Buffer.from(post.transaction, "base64"));
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = giver.publicKey;
  tx.sign(giver);
  const transferSig = await conn.sendRawTransaction(tx.serialize());
  await conn.confirmTransaction(
    { signature: transferSig, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  console.log("[3] Transfer confirmed:");
  console.log("    https://explorer.solana.com/tx/" + transferSig + "?cluster=devnet");

  // 4. chained receipt action -> cNFT mint
  const nextHref: string = post.links.next.href;
  const receiptRes = await fetch(nextHref, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account: giver.publicKey.toBase58(),
      signature: transferSig,
    }),
  });
  const receipt = await receiptRes.json();
  console.log("[4] Receipt action:", receipt.type, "-", receipt.title);
  console.log("    ", receipt.description?.replace(/\n/g, " "));

  console.log("\nDone. Check the live page for the new receipt.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
