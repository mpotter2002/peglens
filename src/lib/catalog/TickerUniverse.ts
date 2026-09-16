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

export class TickerUniverse {
  static readonly DEFAULT = "AAPL";

  static normalize(raw: string | null | undefined): string {
    const ticker = (raw ?? this.DEFAULT).trim().toUpperCase();
    if (!/^[A-Z]{1,6}$/.test(ticker)) {
      return this.DEFAULT;
    }
    return ticker;
  }

  static isDemo(ticker: string): boolean {
    return (DEMO_TICKERS as readonly string[]).includes(ticker);
  }

  static list(): string[] {
    return [...DEMO_TICKERS];
  }
}
