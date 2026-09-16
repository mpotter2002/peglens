import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-peglens-display",
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-peglens-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-peglens-mono",
});

export const metadata: Metadata = {
  title: "PegLens — broker vs chain",
  description:
    "Live premium/discount board for tokenized stocks. Equity vs xStock vs Ondo, with a Raydium-first cheapest route.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
