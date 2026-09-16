export type HermesFeed = {
  id: string;
  symbol: string;
  displaySymbol: string;
  description: string;
  assetType: string;
  isOpen: boolean | null;
  nextOpen: number | null;
  nextClose: number | null;
};

export type HermesPrice = {
  id: string;
  priceUsd: number;
  confidenceUsd: number;
  publishTime: number;
};

type RawFeed = {
  id: string;
  market_hours?: { is_open?: boolean; next_open?: number | null; next_close?: number | null };
  attributes?: Record<string, string>;
};

type RawLatest = {
  parsed?: Array<{
    id: string;
    price: { price: string; conf: string; expo: number; publish_time: number };
  }>;
};

export class HermesClient {
  static baseUrl(): string {
    return process.env.PYTH_HERMES_URL?.replace(/\/$/, "") || "https://hermes.pyth.network";
  }

  static apiKey(): string | null {
    const key = process.env.PYTH_API_KEY?.trim();
    return key ? key : null;
  }

  static async searchFeeds(query: string): Promise<HermesFeed[]> {
    const url = `${this.baseUrl()}/v2/price_feeds?query=${encodeURIComponent(query)}`;
    const { ok, text } = await this.request(url, false);
    if (!ok) {
      return [];
    }
    const parsed = this.parseJson<RawFeed[]>(text);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((feed) => this.normalizeFeed(feed));
  }

  static async latestPrices(ids: string[]): Promise<HermesPrice[]> {
    const key = this.apiKey();
    if (!key || ids.length === 0) {
      return [];
    }
    const params = new URLSearchParams({ parsed: "true", ignore_invalid_price_ids: "true" });
    for (const id of ids) {
      params.append("ids[]", id.startsWith("0x") ? id : `0x${id}`);
    }
    const url = `${this.baseUrl()}/v2/updates/price/latest?${params.toString()}`;
    const { ok, text } = await this.request(url, true);
    if (!ok) {
      return [];
    }
    const body = this.parseJson<RawLatest>(text);
    if (!body?.parsed) {
      return [];
    }
    return body.parsed.map((item) => {
      const expo = Number(item.price.expo);
      const priceUsd = Number(item.price.price) * 10 ** expo;
      const confidenceUsd = Number(item.price.conf) * 10 ** expo;
      return {
        id: item.id.replace(/^0x/, ""),
        priceUsd,
        confidenceUsd,
        publishTime: item.price.publish_time,
      };
    });
  }

  private static normalizeFeed(feed: RawFeed): HermesFeed {
    const attributes = feed.attributes ?? {};
    return {
      id: feed.id.replace(/^0x/, ""),
      symbol: attributes.symbol ?? "",
      displaySymbol: attributes.display_symbol ?? attributes.nasdaq_symbol ?? "",
      description: attributes.description ?? "",
      assetType: attributes.asset_type ?? "",
      isOpen: typeof feed.market_hours?.is_open === "boolean" ? feed.market_hours.is_open : null,
      nextOpen: feed.market_hours?.next_open ?? null,
      nextClose: feed.market_hours?.next_close ?? null,
    };
  }

  private static async request(url: string, withKey: boolean): Promise<{ ok: boolean; text: string }> {
    const headers: Record<string, string> = {
      accept: "application/json",
      "user-agent": "PegLens/0.1 (https://github.com/mpotter2002/peglens)",
    };
    const key = this.apiKey();
    if (withKey && key) {
      headers.authorization = `Bearer ${key}`;
    }
    const response = await fetch(url, { headers, cache: "no-store" });
    return { ok: response.ok, text: await response.text() };
  }

  private static parseJson<T>(text: string): T | null {
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }
}
