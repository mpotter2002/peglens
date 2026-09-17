import type { HermesFeed } from "@/lib/pyth/HermesClient";
import { HermesClient } from "@/lib/pyth/HermesClient";
import { TtlCache } from "@/lib/cache/TtlCache";

export type ResolvedFeeds = {
  ticker: string;
  equity: HermesFeed | null;
  xstock: HermesFeed | null;
  ondo: HermesFeed | null;
  redemption: HermesFeed | null;
  name: string;
};

export class FeedResolver {
  static async resolve(ticker: string): Promise<ResolvedFeeds> {
    const symbol = ticker.trim().toUpperCase();
    const feeds = await TtlCache.remember(
      `pyth-feeds:${symbol}`,
      10 * 60_000,
      () => HermesClient.searchFeeds(symbol),
      { skipCache: (value) => value.length === 0 },
    );
    const equity = this.pick(feeds, `Equity.US.${symbol}/USD`);
    const xstock = this.pick(feeds, `Crypto.${symbol}X/USD`);
    const ondo = this.pick(feeds, `Crypto.${symbol}ON/USD`);
    const redemption = this.pick(feeds, `Crypto.${symbol}X/${symbol}.RR`);
    return {
      ticker: symbol,
      equity,
      xstock,
      ondo,
      redemption,
      name: this.prettyName(equity?.description, symbol),
    };
  }

  static pick(feeds: HermesFeed[], symbol: string): HermesFeed | null {
    return feeds.find((feed) => feed.symbol === symbol) ?? null;
  }

  static prettyName(description: string | undefined, ticker: string): string {
    if (!description) {
      return ticker;
    }
    return description.replace(/\s*\/\s*US DOLLAR$/i, "").trim() || ticker;
  }
}
