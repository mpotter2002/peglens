import { HttpJson } from "@/lib/net/HttpJson";
import { TtlCache } from "@/lib/cache/TtlCache";

export type TerminalQuote = {
  symbol: string;
  priceUsd: number;
  changePct24h: number | null;
};

export class PythTerminalClient {
  static async quote(symbol: string): Promise<TerminalQuote | null> {
    return TtlCache.remember(
      `pyth-terminal:${symbol}`,
      15_000,
      async () => {
        const encoded = encodeURIComponent(symbol);
        const url = `https://app.pyth.com/explore/${encoded}`;
        const { ok, text } = await HttpJson.get(url, {
          headers: { accept: "text/html" },
          timeoutMs: 3_000,
        });
        if (!ok) {
          return null;
        }
        return this.parse(symbol, text);
      },
      { skipCache: (value) => value === null },
    );
  }

  static parse(symbol: string, html: string): TerminalQuote | null {
    // Terminal ships its data inside an RSC payload, so keys may be backslash-escaped (\"changePct24h\":).
    const latest = html.match(/\\?"latestPrice\\?":([0-9]+(?:\.[0-9]+)?)/);
    const meta = html.match(/trading at ([0-9]+(?:\.[0-9]+)?)/i);
    const change = html.match(/\\?"changePct24h\\?":(-?[0-9]+(?:\.[0-9]+)?(?:e-?[0-9]+)?)/i);
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
