import { HttpJson, type HttpJsonResult } from "@/lib/net/HttpJson";

export type IntradayPoint = { time: number; priceUsd: number };

export type IntradaySeries = {
  ticker: string;
  points: IntradayPoint[];
  /** Prior regular-session close. The chart draws it as a dashed baseline. */
  previousClose: number | null;
  last: number;
  source: "yahoo-chart";
};

export type ChartGeometry = {
  points: Array<{ x: number; y: number }>;
  line: string;
  area: string;
  baselineY: number | null;
};

type Fetcher = (url: string) => Promise<HttpJsonResult>;

type RawChart = {
  chart?: {
    result?: Array<{
      meta?: { currency?: string; chartPreviousClose?: number; previousClose?: number };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }> | null;
  };
};

/**
 * Cash-session intraday line for an index ETF, from Yahoo's public 1d/5m chart.
 * Pyth's historical endpoints need an API key, so this is the free real source.
 * Every point is a real 5-minute close. Missing bars are dropped, never interpolated.
 */
export class IntradayChart {
  static readonly MIN_POINTS = 2;

  static url(ticker: string): string {
    return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=5m`;
  }

  static async load(ticker: string, fetcher: Fetcher = (url) => HttpJson.get(url, { timeoutMs: 3_000 })) {
    try {
      const response = await fetcher(this.url(ticker));
      return response.ok ? this.parse(ticker, response.text) : null;
    } catch {
      return null;
    }
  }

  static parse(ticker: string, text: string): IntradaySeries | null {
    const body = HttpJson.parse<RawChart>(text);
    const result = body?.chart?.result?.[0];
    if (!result || (result.meta?.currency && result.meta.currency !== "USD")) {
      return null;
    }
    const times = result.timestamp ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const points: IntradayPoint[] = [];
    times.forEach((time, i) => {
      const priceUsd = closes[i];
      if (typeof priceUsd === "number" && Number.isFinite(priceUsd) && priceUsd > 0) {
        points.push({ time, priceUsd });
      }
    });
    if (points.length < this.MIN_POINTS) {
      return null;
    }
    const prev = result.meta?.chartPreviousClose ?? result.meta?.previousClose;
    return {
      ticker,
      points,
      previousClose: typeof prev === "number" && prev > 0 ? prev : null,
      last: points[points.length - 1].priceUsd,
      source: "yahoo-chart",
    };
  }

  static changePct(series: IntradaySeries): number | null {
    return series.previousClose ? ((series.last - series.previousClose) / series.previousClose) * 100 : null;
  }

  static geometry(series: IntradaySeries, width: number, height: number): ChartGeometry {
    const prices = series.points.map((p) => p.priceUsd);
    if (series.previousClose) prices.push(series.previousClose);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min;
    const y = (price: number) => (span === 0 ? height / 2 : round(((max - price) / span) * height));
    const last = series.points.length - 1;
    const points = series.points.map((p, i) => ({ x: round((i / last) * width), y: y(p.priceUsd) }));
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
    const area = `${line} L${width} ${height} L0 ${height} Z`;
    return { points, line, area, baselineY: series.previousClose ? y(series.previousClose) : null };
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
