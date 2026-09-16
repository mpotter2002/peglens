import { TtlCache } from "@/lib/cache/TtlCache";

export type TerminalQuote = {
  symbol: string;
  priceUsd: number;
  changePct24h: number | null;
};

export class PythTerminalClient {
  static async quote(symbol: string): Promise<TerminalQuote | null> {
    return TtlCache.remember(`pyth-terminal:${symbol}`, 15_000, async () => {
    const encoded = encodeURIComponent(symbol);
    const url = `https://app.pyth.com/explore/${encoded}`;
    const response = await fetch(url, {
      headers: {
        accept: "text/html",
        "user-agent": "PegLens/0.1 (https://github.com/mpotter2002/peglens)",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    const html = await response.text();
    return this.parse(symbol, html);
    });
  }

  static parse(symbol: string, html: string): TerminalQuote | null {
    const latest = html.match(/"latestPrice":([0-9]+(?:\.[0-9]+)?)/);
    const meta = html.match(/trading at ([0-9]+(?:\.[0-9]+)?)/i);
    const change = html.match(/"changePct24h":(-?[0-9]+(?:\.[0-9]+)?)/);
    const priceRaw = latest?.[1] ?? meta?.[1];
    if (!priceRaw) {
      return null;
    }
    const priceUsd = Number(priceRaw);
    if (!Number.isFinite(priceUsd)) {
      return null;
    }
    return {
      symbol,
      priceUsd,
      changePct24h: change ? Number(change[1]) : null,
    };
  }
}
