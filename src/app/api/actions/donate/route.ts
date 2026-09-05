import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  createActionHeaders,
  createPostResponse,
} from "@solana/actions";
import {
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { CAUSE, iconUrl } from "@/lib/config";
import { getConnection, getCausePublicKey } from "@/lib/solana";

// These routes build live transactions and read the wallet secret, so they
// must run on the Node.js runtime and never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = createActionHeaders();

// Memo program, used to stamp each donation with a human-readable note that
// shows up on the explorer.
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

export const GET = async (req: Request) => {
  const { origin } = new URL(req.url);
  const baseHref = `${origin}/api/actions/donate`;

  const payload: ActionGetResponse = {
    type: "action",
    title: `${CAUSE.title} — ${CAUSE.organization}`,
    icon: iconUrl(origin),
    description: CAUSE.description,
    label: "Give",
    links: {
      actions: [
        ...CAUSE.presets.map((amount) => ({
          type: "transaction" as const,
          label: `Give ${amount} SOL`,
          href: `${baseHref}?amount=${amount}`,
        })),
        {
          type: "transaction" as const,
          label: "Give",
          href: `${baseHref}?amount={amount}`,
          parameters: [
            {
              name: "amount",
              label: "SOL amount",
              type: "number" as const,
              min: 0.01,
              required: true,
            },
          ],
        },
      ],
    },
  };

  return Response.json(payload, { headers });
};

// OPTIONS is required for CORS preflight. Mirror the GET headers.
export const OPTIONS = async () => new Response(null, { headers });

export const POST = async (req: Request) => {
  try {
    const url = new URL(req.url);
    const amountStr = url.searchParams.get("amount");
    const amount = Number(amountStr);
    if (!amountStr || !Number.isFinite(amount) || amount <= 0) {
      return Response.json(
        { message: "Invalid donation amount." },
        { status: 400, headers },
      );
    }

    const body: ActionPostRequest = await req.json();
    let giver: PublicKey;
    try {
      giver = new PublicKey(body.account);
    } catch {
      return Response.json(
        { message: "Invalid account provided." },
        { status: 400, headers },
      );
    }

    const cause = getCausePublicKey();
    const connection = getConnection();

    const lamports = Math.round(amount * LAMPORTS_PER_SOL);

    const transferIx = SystemProgram.transfer({
      fromPubkey: giver,
      toPubkey: cause,
      lamports,
    });

    const memoIx = new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [],
      data: Buffer.from(
        `Njia gift: ${amount} SOL for "${CAUSE.title}"`,
        "utf8",
      ),
    });

    // A small priority fee keeps the donation snappy on devnet.
    const priorityIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1000,
    });

    const { blockhash } = await connection.getLatestBlockhash();
    const tx = new Transaction();
    tx.feePayer = giver;
    tx.recentBlockhash = blockhash;
    tx.add(priorityIx, transferIx, memoIx);

    // Chain to a "next" action that mints the cNFT receipt after the transfer
    // confirms. The callback receives the signature and giver account.
    const nextHref = `${url.origin}/api/actions/receipt?amount=${amount}`;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction: tx,
        message: `Thank you for giving ${amount} SOL to ${CAUSE.title}. Minting your receipt...`,
        links: {
          next: {
            type: "post",
            href: nextHref,
          },
        },
      },
    });

    return Response.json(payload, { headers });
  } catch (err) {
    console.error("donate POST error:", err);
    const reason = err instanceof Error ? err.message : String(err);
    return Response.json(
      { message: `Failed to build donation transaction. [${reason}]` },
      { status: 500, headers },
    );
  }
};
