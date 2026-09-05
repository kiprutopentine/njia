/**
 * Compressed-NFT (cNFT) receipts via Metaplex Bubblegum V1.
 *
 * The cause wallet is the tree owner and the mint payer. Each donation mints a
 * cNFT thank-you receipt to the giver. cNFTs are far cheaper to mint than
 * regular NFTs because the data lives in a Merkle tree, which is what makes
 * per-gift receipts economically viable for micro-giving. That cost profile is
 * a Solana-specific capability (state compression).
 */
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  keypairIdentity,
  generateSigner,
  publicKey,
  none,
  type Umi,
} from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import {
  createTree,
  mintV1,
  parseLeafFromMintV1Transaction,
  findLeafAssetIdPda,
  type MetadataArgsArgs,
} from "@metaplex-foundation/mpl-bubblegum";
import bs58 from "bs58";
import { SOLANA_RPC_URL, BASE_URL } from "./config";
import { getCauseWallet } from "./solana";

/** Build a umi instance whose identity is the cause wallet. */
export function getUmi(): Umi {
  const umi = createUmi(SOLANA_RPC_URL);
  const cause = getCauseWallet();
  umi.use(keypairIdentity(fromWeb3JsKeypair(cause)));
  return umi;
}

/**
 * Create a Merkle tree to hold receipt cNFTs. One-time setup.
 * Returns the tree address (base58). Depth 14 / buffer 64 holds ~16k leaves,
 * plenty for a demo and cheap to allocate.
 */
export async function createReceiptTree(): Promise<string> {
  const umi = getUmi();
  const merkleTree = generateSigner(umi);
  const builder = await createTree(umi, {
    merkleTree,
    maxDepth: 14,
    maxBufferSize: 64,
    public: false,
  });
  await builder.sendAndConfirm(umi);
  return merkleTree.publicKey.toString();
}

/** Metadata for a Njia receipt cNFT. */
function receiptMetadata(
  giver: string,
  amountSol: number,
  transferSig: string,
): MetadataArgsArgs {
  const dateStr = new Date().toISOString().slice(0, 10);
  return {
    name: `Njia Receipt: ${amountSol} SOL`,
    symbol: "NJIA",
    // Points to an on-app JSON metadata route so the asset resolves in wallets
    // and explorers that fetch the URI.
    uri: `${BASE_URL}/api/receipt-metadata?giver=${giver}&amount=${amountSol}&sig=${transferSig}&date=${dateStr}`,
    sellerFeeBasisPoints: 0,
    collection: none(),
    creators: [],
  };
}

export interface MintReceiptResult {
  cnftSig: string;
  assetId: string;
}

/**
 * Mint a receipt cNFT to the giver's wallet.
 * Requires CNFT_TREE_ADDRESS to be set (see `pnpm setup:tree`).
 */
export async function mintReceipt(params: {
  giver: string;
  amountSol: number;
  transferSig: string;
}): Promise<MintReceiptResult> {
  const treeAddress = process.env.CNFT_TREE_ADDRESS;
  if (!treeAddress) {
    throw new Error("CNFT_TREE_ADDRESS is not set. Run `pnpm setup:tree`.");
  }

  const umi = getUmi();
  const merkleTree = publicKey(treeAddress);
  const leafOwner = publicKey(params.giver);

  const metadata = receiptMetadata(
    params.giver,
    params.amountSol,
    params.transferSig,
  );

  const { signature } = await mintV1(umi, {
    leafOwner,
    merkleTree,
    metadata,
  }).sendAndConfirm(umi);

  const cnftSig = bs58.encode(signature);

  // Derive the asset id from the minted leaf for explorer/wallet lookups.
  let assetId = "";
  try {
    const leaf = await parseLeafFromMintV1Transaction(umi, signature);
    const [assetIdPda] = findLeafAssetIdPda(umi, {
      merkleTree,
      leafIndex: leaf.nonce,
    });
    assetId = assetIdPda.toString();
  } catch {
    // Non-fatal: the mint succeeded even if leaf parsing hiccups.
  }

  return { cnftSig, assetId };
}
