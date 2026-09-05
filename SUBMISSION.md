---
title: "Njia: generosity you can drop anywhere (a Solana Blink that gives back a receipt)"
published: false
tags: devchallenge, weekendchallenge, solana, web3
---

*This is a submission for [Weekend Challenge: Generosity Edition](https://dev.to/challenges/weekend-2026-09-03)*

## What I Built

Njia turns any link into a one-tap act of giving.

Most on-chain donation tools are a website you have to go to. You leave your
conversation, open a dApp, connect a wallet, and hope you're on the right site.
Njia flips that. The product is not a website. It is a link. You drop it into a
tweet, a WhatsApp status, a Discord channel, or a printed QR code, and a
wallet turns it into a payment right where the person already is. No app to
install, no site to visit.

Every gift also mints a compressed-NFT thank-you receipt straight to the
giver's wallet: proof of their generosity that they own, verifiable on-chain.

The name is Swahili for *path* or *way*. Giving that travels anywhere a link
can go.

## Demo

The whole product is one link. Here is the flow:

1. A cause publishes a Blink for a concrete need: *Feed 5 kids lunch*, goal 5 SOL.
2. Someone taps the link inside a chat. Their wallet pops up a donation
   preview. One tap sends the SOL on devnet.
3. The moment the transfer confirms, the Action chains to a second step that
   mints a compressed-NFT receipt to the giver.
4. A live page tracks goal progress and shows a wall of receipts, each linking
   straight to the Solana Explorer.

<!-- Embed the demo video / deployed link here -->

**Live page:** <!-- deployed URL -->
**Try the Blink:** open the deployed `/donate` link in a Blink-aware wallet, or
paste the Action URL into the [Blinks Inspector](https://www.blinks.xyz/inspector).

## Code

<!-- GitHub repo embed -->

## How I Built It

The stack is deliberately small: Next.js (App Router) on TypeScript, where the
API routes *are* the Action server, plus the Solana devnet.

**The Action server.** A Solana Action is two HTTP endpoints. A `GET` returns
the metadata a wallet renders: title, icon, description, and the donation
buttons (0.1 / 0.5 / 1 SOL, plus a custom amount field). A `POST` takes the
giver's account and returns a serialized transaction to sign. The transaction
is a `SystemProgram` transfer to the cause wallet, a SPL Memo stamping the gift
with a human-readable note, and a small priority fee so it lands fast. An
`actions.json` at the domain root maps the shareable `/donate` URL to the API,
which is what lets the link unfurl as a Blink.

One detail that matters: the Actions spec makes the *giver* the fee payer. So
the donation itself needs zero funds in the cause wallet. That keeps the core
giving flow dependency-free.

**Chaining the receipt.** The interesting part is what happens after the money
moves. The `POST` response includes a `links.next` pointer to a second Action.
Once the transfer confirms on-chain, the wallet calls that endpoint with the
transaction signature. That is where the compressed NFT gets minted to the
giver, and the Blink updates to a "thank you" completed state without the user
doing anything else.

**Why compressed NFTs.** A normal NFT per donation would be absurd: the mint
could cost more than a small gift. Compressed NFTs store their data in a Merkle
tree via state compression, which drops the cost by orders of magnitude. That
is the whole reason a per-gift receipt is economically sane for micro-giving. I
used Metaplex Bubblegum through umi: create one Merkle tree up front, then
`mintV1` a receipt to the giver's address on each donation. The receipt's
metadata URI points back at an app route that returns standard NFT JSON, so it
resolves in wallets and explorers.

**The live page.** A thin client that polls the receipt feed, shows a goal
progress bar, and renders the wall of gifts. Every receipt links to its
transfer and its cNFT on the Solana Explorer, so nothing is taken on trust.

### Why these Solana primitives

This is the part I want to call out, because it is why the project belongs in
the Solana category rather than being "a donation app that happens to use a
chain."

- **Blinks / Actions** make giving portable. The unit of distribution is a URL,
  so generosity meets people in the surfaces they already use instead of asking
  them to come to a dApp.
- **Compressed NFTs** make per-gift receipts affordable. That specific cost
  profile is a state-compression capability, and it is what makes the
  thank-you receipt a feature rather than a gimmick.

Neither of those is a generic blockchain feature bolted on for the category.
The product only exists because both are cheap and native on Solana.

## Prize Categories

**Best Use of Solana** — Blinks (Solana Actions) for portable, in-context
giving, and compressed NFTs for affordable per-gift receipts.

<!-- Thanks for reading! -->
