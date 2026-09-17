export const DEMO_TICKERS = [
  "AAPL",
  "TSLA",
  "NVDA",
  "MSFT",
  "AMZN",
  "GOOGL",
  "META",
  "SPY",
  "QQQ",
  "CRCL",
  "COIN",
  "MSTR",
] as const;

const CATALOG_NAMES: Record<(typeof DEMO_TICKERS)[number], string> = {
  AAPL: "Apple",
  TSLA: "Tesla",
  NVDA: "NVIDIA",
  MSFT: "Microsoft",
  AMZN: "Amazon",
  GOOGL: "Alphabet",
  META: "Meta",
  SPY: "SPDR S&P 500",
  QQQ: "Invesco QQQ",
  CRCL: "Circle",
  COIN: "Coinbase",
  MSTR: "Strategy",
};

export class TickerUniverse {
  static readonly DEFAULT = "AAPL";

  static normalize(raw: string | null | undefined): string {
    const ticker = (raw ?? this.DEFAULT).trim().toUpperCase();
    if (!/^[A-Z]{1,6}$/.test(ticker)) {
      return this.DEFAULT;
    }
    return ticker;
  }

  static fromSearchParam(raw: string | string[] | null | undefined): string | null {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value == null || value.trim() === "") {
      return null;
    }
    return this.normalize(value);
  }

  static isDemo(ticker: string): boolean {
    return (DEMO_TICKERS as readonly string[]).includes(ticker);
  }

  static list(): string[] {
    return [...DEMO_TICKERS];
  }

  static catalogName(ticker: string): string | null {
    const key = ticker.trim().toUpperCase();
    if ((DEMO_TICKERS as readonly string[]).includes(key)) {
      return CATALOG_NAMES[key as (typeof DEMO_TICKERS)[number]];
    }
    return null;
  }
}
