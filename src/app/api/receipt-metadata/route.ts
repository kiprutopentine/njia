import { ACTIONS_CORS_HEADERS } from "@solana/actions";
import { CAUSE, iconUrl } from "@/lib/config";

/**
 * Standard NFT metadata JSON for a receipt cNFT. The cNFT's `uri` points here
 * so wallets and explorers can render the receipt with an image and
 * attributes.
 */
export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const amount = url.searchParams.get("a") ?? url.searchParams.get("amount") ?? "0";
  const date = url.searchParams.get("d") ?? url.searchParams.get("date") ?? "";

  const metadata = {
    name: `Njia Receipt: ${amount} SOL`,
    symbol: "NJIA",
    description:
      `Thank you for giving ${amount} SOL to "${CAUSE.title}" via ${CAUSE.organization}. ` +
      `This compressed-NFT is your on-chain proof of generosity.`,
    image: iconUrl(),
    external_url: url.origin,
    attributes: [
      { trait_type: "Cause", value: CAUSE.title },
      { trait_type: "Amount (SOL)", value: amount },
      { trait_type: "Date", value: date },
    ],
    properties: {
      category: "image",
      files: [{ uri: iconUrl(), type: "image/svg+xml" }],
    },
  };

  return Response.json(metadata, { headers: ACTIONS_CORS_HEADERS });
};

export const OPTIONS = async () =>
  new Response(null, { headers: ACTIONS_CORS_HEADERS });
