import { describe, expect, it } from "vitest";
import { IntradayChart } from "@/lib/market/IntradayChart";

/** Shape copied from a live query1.finance.yahoo.com/v8/finance/chart/SPY?range=1d&interval=5m response. */
function yahoo(closes: Array<number | null>, meta: Record<string, unknown> = {}) {
  const start = 1790083800;
  return JSON.stringify({
    chart: {
      result: [
        {
          meta: {
            currency: "USD",
            symbol: "SPY",
            exchangeTimezoneName: "America/New_York",
            regularMarketPrice: 773.38,
            chartPreviousClose: 773.5,
            regularMarketTime: 1790107200,
            dataGranularity: "5m",
            ...meta,
          },
          timestamp: closes.map((_, i) => start + i * 300),
          indicators: { quote: [{ close: closes }] },
        },
      ],
      error: null,
    },
  });
}

describe("IntradayChart.parse", () => {
  it("keeps real closes in order and drops null bars instead of interpolating", () => {
    const series = IntradayChart.parse("SPY", yahoo([774.8, null, 774.96, 774.61]));
    expect(series?.points.map((p) => p.priceUsd)).toEqual([774.8, 774.96, 774.61]);
    expect(series?.points[1].time).toBe(1790083800 + 600);
    expect(series?.previousClose).toBe(773.5);
    expect(series?.last).toBe(774.61);
  });

  it("returns null for errors, non-USD, or too few points to draw a line", () => {
    expect(IntradayChart.parse("SPY", "")).toBeNull();
    expect(IntradayChart.parse("SPY", JSON.stringify({ chart: { result: null, error: { code: "Not Found" } } }))).toBeNull();
    expect(IntradayChart.parse("SPY", yahoo([774.8, 775], { currency: "EUR" }))).toBeNull();
    expect(IntradayChart.parse("SPY", yahoo([774.8]))).toBeNull();
    expect(IntradayChart.parse("SPY", yahoo([null, null, null]))).toBeNull();
  });

  it("reports the session change from the previous close, not from the first bar", () => {
    const series = IntradayChart.parse("SPY", yahoo([770, 780]))!;
    expect(IntradayChart.changePct(series)).toBeCloseTo(((780 - 773.5) / 773.5) * 100, 6);
  });
});

describe("IntradayChart.path", () => {
  it("maps the lowest price to the bottom and the highest to the top of the box", () => {
    const series = IntradayChart.parse("SPY", yahoo([10, 20, 15], { chartPreviousClose: 15 }))!;
    const geo = IntradayChart.geometry(series, 100, 40);
    expect(geo.points[0]).toEqual({ x: 0, y: 40 });
    expect(geo.points[1]).toEqual({ x: 50, y: 0 });
    expect(geo.points[2]).toEqual({ x: 100, y: 20 });
    expect(geo.line.startsWith("M0 40")).toBe(true);
    expect(geo.baselineY).toBe(20);
  });

  it("keeps the previous-close baseline in frame even when the day never touched it", () => {
    const series = IntradayChart.parse("SPY", yahoo([110, 120], { chartPreviousClose: 100 }))!;
    const geo = IntradayChart.geometry(series, 100, 40);
    expect(geo.baselineY).toBe(40);
    expect(geo.points[1].y).toBe(0);
  });

  it("draws a flat day as a centered line instead of dividing by zero", () => {
    const series = IntradayChart.parse("SPY", yahoo([50, 50, 50], { chartPreviousClose: 50 }))!;
    const geo = IntradayChart.geometry(series, 100, 40);
    expect(geo.points.every((p) => p.y === 20)).toBe(true);
  });
});

describe("IntradayChart.load", () => {
  it("fetches the Yahoo 1d/5m chart for the ticker and parses it", async () => {
    const urls: string[] = [];
    const series = await IntradayChart.load("QQQ", "1D", async (url) => {
      urls.push(url);
      return { ok: true, status: 200, text: yahoo([740, 745, 747], { symbol: "QQQ" }) };
    });
    expect(urls[0]).toContain("/v8/finance/chart/QQQ");
    expect(urls[0]).toContain("range=1d");
    expect(urls[0]).toContain("interval=5m");
    expect(series?.points).toHaveLength(3);
  });

  it("maps each chart range to the right Yahoo range/interval pair", async () => {
    const urls: string[] = [];
    const fetcher = async (url: string) => {
      urls.push(url);
      return { ok: true, status: 200, text: yahoo([740, 745]) };
    };
    await IntradayChart.load("SPY", "1W", fetcher);
    await IntradayChart.load("SPY", "1M", fetcher);
    await IntradayChart.load("SPY", "1Y", fetcher);
    expect(urls[0]).toContain("range=5d&interval=15m");
    expect(urls[1]).toContain("range=1mo&interval=1d");
    expect(urls[2]).toContain("range=1y&interval=1wk");
  });

  it("normalizeRange accepts known ranges and defaults anything else to 1D", () => {
    expect(IntradayChart.normalizeRange("1w")).toBe("1W");
    expect(IntradayChart.normalizeRange("3M")).toBe("3M");
    expect(IntradayChart.normalizeRange("garbage")).toBe("1D");
    expect(IntradayChart.normalizeRange(null)).toBe("1D");
  });

  it("keeps real volumes on points and drops missing ones", () => {
    const body = JSON.parse(yahoo([10, 11]));
    body.chart.result[0].indicators.quote[0].volume = [1000, null];
    const series = IntradayChart.parse("SPY", JSON.stringify(body));
    expect(series?.points[0].volume).toBe(1000);
    expect(series?.points[1].volume).toBeUndefined();
  });

  it("returns null on HTTP failure or a thrown fetch so the card shows an honest empty state", async () => {
    expect(await IntradayChart.load("SPY", "1D", async () => ({ ok: false, status: 429, text: "" }))).toBeNull();
    expect(
      await IntradayChart.load("SPY", "1D", async () => {
        throw new Error("boom");
      }),
    ).toBeNull();
  });
});
