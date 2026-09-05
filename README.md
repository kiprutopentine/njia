# Njia

**Generosity you can drop anywhere.** A Solana Blink turns any link into a
one-tap gift, and every gift mints a compressed-NFT thank-you receipt to the
giver's wallet.

Built for the [DEV Weekend Challenge: Generosity Edition](https://dev.to/challenges/weekend-2026-09-03),
targeting **Best Use of Solana**.

> "Njia" is Swahili for *path* or *way* — giving that travels anywhere a link
> can go.

---

## The idea

Most on-chain donation tools are a website you visit. Njia inverts that. The
product is a link. Because a Solana Action is just a URL, giving happens where
people already are: a tweet, a WhatsApp status, a Discord message, a printed QR
code. A Blink-aware wallet turns that link into a one-tap payment with no app
to install and no site to visit.

Two Solana-specific primitives make this work:

- **Blinks / Actions** — any transaction becomes a shareable link that triggers
  a wallet payment in place.
- **Compressed NFTs** — state compression makes minting a receipt cheap enough
  that a per-gift "thank-you" NFT is viable even for micro-donations. On most
  chains a per-donation NFT would cost more than a small donation itself.

## How it flows

1. A cause publishes a Blink for a concrete need (`Feed 5 kids lunch`, goal 5 SOL).
2. The Blink URL is shared anywhere. One tap gives via the giver's wallet.
3. When the transfer confirms, the Action **chains** to a second step that mints
   a compressed-NFT receipt to the giver.
4. A live page shows goal progress and a wall of receipts, each linking to the
   Solana Explorer (devnet).

## Architecture

```
Blink client (wallet / dial.to / X)
        │  GET  /api/actions/donate         → metadata + amount buttons
        │  POST /api/actions/donate?amount= → SOL transfer tx (giver pays)
        │  (wallet signs + sends)
        │  POST /api/actions/receipt        → mints cNFT receipt, returns "completed"
        ▼
Next.js App Router (API routes = the Action server)
        │  /actions.json                    → maps /donate to the Action API
        │  /api/receipt-metadata            → NFT metadata JSON for the cNFT uri
        │  /api/receipts                    → feed for the live page
        ▼
Solana devnet
        SystemProgram transfer + SPL Memo   (paid by giver)
        Bubblegum mintV1 → compressed NFT   (paid by cause wallet)
```

Key files:

| Path | Role |
|------|------|
| `src/app/api/actions/donate/route.ts` | GET metadata, POST transfer, chains to receipt |
| `src/app/api/actions/receipt/route.ts` | Chained action: mints cNFT, records receipt |
| `src/app/actions.json/route.ts` | Blink mapping at domain root |
| `src/lib/cnft.ts` | Merkle tree creation + cNFT mint (Metaplex Bubblegum) |
| `src/lib/solana.ts` | Connection + cause-wallet loading |
| `src/app/page.tsx` | Live progress page + wall of receipts |

The Action spec puts the **giver** as the fee payer, so the donation transfer
needs no funds in the cause wallet. The cause wallet only pays for the cheap
cNFT receipt mints.

## Run it locally

Prerequisites: Node 18+, pnpm.

```bash
pnpm install

# 1. Generate the cause/treasury wallet (prints a base58 secret)
npx tsx scripts/setup-wallet.ts
# copy the secret into .env as CAUSE_WALLET_SECRET

# 2. Fund the cause wallet with devnet SOL (needed for cNFT mints).
#    The public faucet is often rate-limited; alternatives:
#      solana airdrop 2 <PUBKEY> --url devnet
#      devnet-pow mine ...              (proof-of-work faucet)
#    or https://faucet.solana.com
npx tsx scripts/airdrop.ts 1

# 3. Create the Merkle tree that holds receipt cNFTs
npx tsx scripts/setup-tree.ts
# copy the tree address into .env as CNFT_TREE_ADDRESS

# 4. Run
pnpm dev
```

Copy `.env.example` to `.env` and fill in the values as you go.

To disable cNFT minting (transfer-only mode, no cause-wallet funding needed):
set `ENABLE_CNFT_RECEIPT=false` in `.env`.

## Test the Blink

- Live page: `http://localhost:3000`
- Unfurl the Action in a browser via the Blinks interstitial:
  `https://dial.to/?action=solana-action:<url-encoded /api/actions/donate>`
- Inspect and debug with the [Blinks Inspector](https://www.blinks.xyz/inspector).

## Tech

- Next.js 14 (App Router), TypeScript
- `@solana/actions`, `@solana/web3.js`
- Metaplex Bubblegum (`@metaplex-foundation/mpl-bubblegum`) + umi for cNFTs
- Solana devnet

## Challenge compliance

Started and built within the DEV Weekend Challenge window (opened
2026-09-04 02:00 UTC). Any commits made after the submission deadline are noted
here. Credits for third-party code are given inline where used; the Action route
structure follows the official `@solana/actions` examples.

## License

MIT
