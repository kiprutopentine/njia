"use client";

import { useEffect, useState } from "react";

interface Receipt {
  giver: string;
  amountSol: number;
  transferSig: string;
  cnftSig?: string;
  assetId?: string;
  at: number;
}

interface Feed {
  cause: { title: string; organization: string; goalSol: number };
  totalRaisedSol: number;
  receipts: Receipt[];
}

const short = (s: string) => (s.length > 12 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s);
const tx = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
const asset = (id: string) =>
  `https://explorer.solana.com/address/${id}?cluster=devnet`;

export default function Home() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [blinkUrl, setBlinkUrl] = useState("");
  const [donateUrl, setDonateUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const origin = window.location.origin;
    const action = `${origin}/api/actions/donate`;
    setDonateUrl(`${origin}/donate`);
    // dial.to interstitial unfurls any action URL as a blink in the browser.
    setBlinkUrl(`https://dial.to/?action=solana-action:${encodeURIComponent(action)}`);

    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/receipts", { cache: "no-store" });
        const data = (await res.json()) as Feed;
        if (alive) setFeed(data);
      } catch {
        /* ignore transient errors */
      }
    };
    load();
    const t = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const goal = feed?.cause.goalSol ?? 5;
  const raised = feed?.totalRaisedSol ?? 0;
  const pct = Math.min(100, Math.round((raised / goal) * 100));

  const copy = async () => {
    await navigator.clipboard.writeText(blinkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="container">
      <div className="hero">
        <img src="/njia-icon.svg" alt="Njia" />
        <div>
          <h1>Njia</h1>
          <p>
            Generosity you can drop anywhere. A Solana Blink turns any link into
            a one-tap gift, and every gift mints a compressed-NFT thank-you
            receipt to the giver.
          </p>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>{feed?.cause.title ?? "Loading cause…"}</h2>
          <div className="progress-num">
            {raised.toFixed(2)} <span>/ {goal} SOL</span>
          </div>
          <div className="bar">
            <div style={{ width: `${pct}%` }} />
          </div>
          <div className="progress-meta">
            {pct}% funded · {feed?.receipts.length ?? 0} gifts ·{" "}
            {feed?.cause.organization ?? ""}
          </div>
        </div>

        <div className="card">
          <h2>The Blink</h2>
          <div className="blink-box">
            <div className="blink-url">{donateUrl || "…"}</div>
          </div>
          <p className="hint">
            This link is the whole product. Drop it in a tweet, a chat, or a QR
            code. A Blink-aware wallet turns it into a one-tap gift, no site
            visit required.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {blinkUrl && (
              <a className="btn" href={blinkUrl} target="_blank" rel="noreferrer">
                Open as Blink ↗
              </a>
            )}
            <button className="btn secondary" onClick={copy} disabled={!blinkUrl}>
              {copied ? "Copied ✓" : "Copy Blink URL"}
            </button>
          </div>
        </div>
      </div>

      <section className="wall">
        <h2>Wall of receipts</h2>
        {feed && feed.receipts.length === 0 && (
          <div className="empty">
            No gifts yet. Be the first — open the Blink above and give on devnet.
          </div>
        )}
        <div className="receipts">
          {feed?.receipts.map((r) => (
            <div className="receipt" key={r.transferSig}>
              <div className="amt">{r.amountSol} SOL</div>
              <div className="who">from {short(r.giver)}</div>
              <div className="links">
                <a href={tx(r.transferSig)} target="_blank" rel="noreferrer">
                  transfer ↗
                </a>
                {r.cnftSig && (
                  <a href={tx(r.cnftSig)} target="_blank" rel="noreferrer">
                    receipt tx ↗
                  </a>
                )}
                {r.assetId && (
                  <a href={asset(r.assetId)} target="_blank" rel="noreferrer">
                    cNFT ↗
                  </a>
                )}
              </div>
              {r.cnftSig ? (
                <span className="badge">receipt minted</span>
              ) : (
                <span className="badge pending">gift confirmed</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer>
        Built on Solana devnet for the DEV Weekend Challenge: Generosity Edition.
        Blinks + compressed NFTs. All transactions are viewable on the Solana
        Explorer (devnet).
      </footer>
    </main>
  );
}
