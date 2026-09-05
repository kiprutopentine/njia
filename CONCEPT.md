# Njia — Second Idea (Solana), BACKUP

("Njia" = Swahili for "path/way" — giving that travels anywhere via a Blink link.
Renamed from "Mkono" to avoid confusion with the primary idea "Mikono".)

DEV Weekend Challenge: Generosity Edition. Target category: Best Use of Solana.
Submissions due: 2026-09-07 06:59 UTC.

Status: BACKUP / insurance. Build only if the primary (Mikono) stalls.

## One-liner
Generosity you can drop anywhere: a Solana Blink turns any link into a one-tap
act of giving, and each gift mints a cheap compressed-NFT "thank-you" receipt
to the giver.

## Why this angle beats the crowded Solana lane
The existing Solana entries (VeriAid, ProofGive, LendingChain, PadForward) all
built a website you visit to donate — an on-chain donation LEDGER. This does the
opposite: it makes giving PORTABLE. The Blink is just a URL, so giving happens
where people already are (a tweet, WhatsApp status, Discord, a QR poster), no
dApp visit, no signup.

## Solana-specific primitives (the "best use" justification)
- Blinks / Actions: any transaction becomes a shareable link that triggers a
  wallet payment anywhere. Nobody else used this.
- Compressed NFTs: ~2,400x cheaper to mint, so per-gift impact receipts are
  economically viable for micro-giving. Cheap-only-on-Solana capability.

## Core flow
1. A cause creates a Blink for a concrete need ("feed 5 kids lunch, 2 SOL").
2. The Blink URL is shared anywhere; one tap gives via the user's wallet.
3. On donation, a compressed NFT receipt is minted to the giver's wallet
   ("you funded lunch, Sep 6, tx ...").
4. Live page shows Blink progress + wall of cNFT receipts.

## Demo (strong, visual)
Click a link inside a chat window -> wallet pops -> tokens confirm on devnet ->
receipt NFT appears. Judges can click through on the explorer.

## Honest risk
Blinks + cNFT on devnet = more moving parts (Action server + wallet + cNFT
tooling). Higher build risk in the time window than the Snowflake primary.

## Stack (proposed)
- Solana devnet (free airdropped SOL).
- Action/Blink server (Node/TS is the smoother path).
- cNFT minting via state compression tooling.
- Light frontend for the live page.

## Status
- [ ] Devnet wallet + airdrop
- [ ] Action/Blink server
- [ ] Transfer + cNFT mint
- [ ] Live page
- [ ] README + demo video
- [ ] DEV writeup
