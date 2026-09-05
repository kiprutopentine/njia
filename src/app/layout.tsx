import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Njia — Generosity you can drop anywhere",
  description:
    "A Solana Blink turns any link into a one-tap gift. Each gift mints a " +
    "compressed-NFT thank-you receipt to the giver.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
