import { PegMath } from "@/lib/board/PegMath";
import { PythTerminalClient, type TerminalQuote } from "@/lib/pyth/PythTerminalClient";
import type { PegSign } from "@/lib/types";

export type PulseLeg = {
  symbol: string;
  priceUsd: number;
  changePct24h: number | null;
};

export type PulseRow = {
  ticker: string;
  name: string;
  cash: PulseLeg | null;
  xstock: PulseLeg | null;
  gapBps: number | null;
  sign: PegSign;
};

export type GapBar = {
  ticker: string;
  gapBps: number | null;
  sign: PegSign;
  widthPct: number;
};

export type MarketPulseSnapshot = {
  fetchedAt: number;
  rows: PulseRow[];
};

type QuoteFn = (symbol: string) => Promise<TerminalQuote | null>;

export const INDEX_TICKERS = [
  { ticker: "SPY", name: "S&P 500" },
  { ticker: "QQQ", name: "Nasdaq-100" },
] as const;

export class MarketPulse {
  /** Bars are scaled to the widest gap, but never tighter than this, so a calm tape stays visibly calm. */
  static readonly MIN_SCALE_BPS = 25;

  static symbols(ticker: string): { cash: string; xstock: string } {
    const symbol = ticker.trim().toUpperCase();
    return { cash: `Equity.US.${symbol}/USD`, xstock: `Crypto.${symbol}X/USD` };
  }

  static row(ticker: string, name: string, cash: TerminalQuote | null, xstock: TerminalQuote | null): PulseRow {
    const gapBps = cash && xstock ? PegMath.premiumBps(xstock.priceUsd, cash.priceUsd) : null;
    return {
      ticker,
      name,
      cash: cash ? this.leg(cash) : null,
      xstock: xstock ? this.leg(xstock) : null,
      gapBps,
      sign: PegMath.sign(gapBps),
    };
  }

  static gapChart(rows: PulseRow[]): { scaleBps: number; bars: GapBar[] } {
    const priced = rows.filter((row) => row.gapBps !== null);
    const widest = priced.reduce((max, row) => Math.max(max, Math.abs(row.gapBps as number)), 0);
    const scaleBps = Math.max(widest, this.MIN_SCALE_BPS);
    const bars = [...rows]
      .sort((a, b) => {
        if (a.gapBps === null) return b.gapBps === null ? 0 : 1;
        if (b.gapBps === null) return -1;
        return Math.abs(b.gapBps) - Math.abs(a.gapBps);
      })
      .map((row) => ({
        ticker: row.ticker,
        gapBps: row.gapBps,
        sign: row.sign,
        widthPct: row.gapBps === null ? 0 : (Math.abs(row.gapBps) / scaleBps) * 100,
      }));
    return { scaleBps, bars };
  }

  /** Pyth Terminal is a public page, not an API. Keep the fan-out polite so it doesn't throttle us. */
  static readonly DEFAULT_CONCURRENCY = 4;

  static async load(options: {
    tickers: ReadonlyArray<{ ticker: string; name: string }>;
    quote?: QuoteFn;
    now?: () => number;
    concurrency?: number;
  }): Promise<MarketPulseSnapshot> {
    const quote = options.quote ?? ((symbol: string) => PythTerminalClient.quote(symbol));
    const symbols = options.tickers.flatMap(({ ticker }) => {
      const pair = this.symbols(ticker);
      return [pair.cash, pair.xstock];
    });
    const quotes = await this.pool(symbols, options.concurrency ?? this.DEFAULT_CONCURRENCY, async (symbol) => {
      try {
        return await quote(symbol);
      } catch {
        return null;
      }
    });
    const rows = options.tickers.map(({ ticker, name }, i) => this.row(ticker, name, quotes[i * 2], quotes[i * 2 + 1]));
    return { fetchedAt: (options.now ?? Date.now)(), rows };
  }

  private static async pool<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await work(items[index]);
      }
    });
    await Promise.all(lanes);
    return results;
  }

  static isEmpty(snapshot: MarketPulseSnapshot): boolean {
    return snapshot.rows.every((row) => row.cash === null && row.xstock === null);
  }

  private static leg(quote: TerminalQuote): PulseLeg {
    return {
      symbol: quote.symbol,
      priceUsd: quote.priceUsd,
      changePct24h: quote.changePct24h !== null && Number.isFinite(quote.changePct24h) ? quote.changePct24h : null,
    };
  }
}
