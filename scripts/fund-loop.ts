/**
 * Patient background airdrop: retry until the cause wallet is funded, then
 * stop. Handles the devnet faucet's rolling rate limit by waiting between
 * attempts. Writes a marker file on success.
 * Usage: npx tsx scripts/fund-loop.ts
 */
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { config } from "dotenv";
import * as fs from "fs";

config();

const RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const PK = new PublicKey("7ZuumnDEpQJZenE3SRbG7KBuPhaf4P7yHtkeUutfERHK");
const TARGET_SOL = 0.2;
const INTERVAL_MS = 90_000;

async function main() {
  const conn = new Connection(RPC, "confirmed");
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt++;
    const bal = await conn.getBalance(PK);
    if (bal >= TARGET_SOL * LAMPORTS_PER_SOL) {
      const msg = `FUNDED at attempt ${attempt}: ${bal / LAMPORTS_PER_SOL} SOL`;
      console.log(msg);
      fs.writeFileSync("/tmp/njia-funded.txt", msg + "\n");
      return;
    }
    try {
      const sig = await conn.requestAirdrop(PK, 1 * LAMPORTS_PER_SOL);
      const bh = await conn.getLatestBlockhash();
      await conn.confirmTransaction({ signature: sig, ...bh }, "confirmed");
      const after = await conn.getBalance(PK);
      const msg = `FUNDED via airdrop attempt ${attempt}: ${after / LAMPORTS_PER_SOL} SOL, tx ${sig}`;
      console.log(msg);
      fs.writeFileSync("/tmp/njia-funded.txt", msg + "\n");
      return;
    } catch (e) {
      console.log(
        `attempt ${attempt}: ${(e as Error).message.slice(0, 60)} — retrying in ${INTERVAL_MS / 1000}s`,
      );
      await new Promise((r) => setTimeout(r, INTERVAL_MS));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
