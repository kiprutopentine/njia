/**
 * Retry a devnet airdrop for the configured cause wallet.
 * Usage: npx tsx scripts/airdrop.ts [amountSol]
 */
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { config } from "dotenv";
import { getCauseWallet } from "../src/lib/solana";

config();

const RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const amountSol = Number(process.argv[2] ?? "1");

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const wallet = getCauseWallet();
  const pk = wallet.publicKey;
  console.log("Funding:", pk.toBase58());

  const before = await conn.getBalance(pk);
  console.log("Balance before:", before / LAMPORTS_PER_SOL, "SOL");

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      console.log(`Airdrop attempt ${attempt} (${amountSol} SOL)...`);
      const sig = await conn.requestAirdrop(pk, amountSol * LAMPORTS_PER_SOL);
      const bh = await conn.getLatestBlockhash();
      await conn.confirmTransaction({ signature: sig, ...bh }, "confirmed");
      const after = await conn.getBalance(pk);
      console.log("Success. Balance now:", after / LAMPORTS_PER_SOL, "SOL");
      console.log("Tx:", `https://explorer.solana.com/tx/${sig}?cluster=devnet`);
      return;
    } catch (err) {
      console.warn(`  failed: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
  console.error(
    "\nAll airdrop attempts failed. Fund manually at https://faucet.solana.com",
  );
  console.error("Public key:", pk.toBase58());
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
