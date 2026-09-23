import { describe, expect, it } from "vitest";
import { MarketPulse } from "@/lib/market/MarketPulse";
import type { TerminalQuote } from "@/lib/pyth/PythTerminalClient";

function q(symbol: string, priceUsd: number, changePct24h: number | null = null): TerminalQuote {
  return { symbol, priceUsd, changePct24h };
}

describe("MarketPulse.symbols", () => {
  it("maps a ticker to its Pyth cash and xStock feed symbols", () => {
    expect(MarketPulse.symbols("SPY")).toEqual({ cash: "Equity.US.SPY/USD", xstock: "Crypto.SPYX/USD" });
  });
});

describe("MarketPulse.row", () => {
  it("computes the xStock gap vs cash from real prints", () => {
    const row = MarketPulse.row("SPY", "S&P 500", q("Equity.US.SPY/USD", 773.61, -0.03), q("Crypto.SPYX/USD", 777.96, 0.4));
    expect(row.cash?.priceUsd).toBe(773.61);
    expect(row.cash?.changePct24h).toBe(-0.03);
    expect(row.xstock?.priceUsd).toBe(777.96);
    expect(row.gapBps).toBeCloseTo(56.23, 1);
    expect(row.sign).toBe("premium");
  });

  it("leaves the gap empty when either side has no print, never zero", () => {
    const row = MarketPulse.row("CRCL", "Circle", q("Equity.US.CRCL/USD", 120), null);
    expect(row.xstock).toBeNull();
    expect(row.gapBps).toBeNull();
    expect(row.sign).toBe("unavailable");
  });
});

describe("MarketPulse.gapChart", () => {
  it("orders by absolute gap, puts missing prints last, and sizes bars on a fixed ±1% scale", () => {
    const rows = [
      MarketPulse.row("AAPL", "Apple", q("a", 100), q("b", 100.2)),
      MarketPulse.row("TSLA", "Tesla", q("a", 100), q("b", 99.4)),
      MarketPulse.row("CRCL", "Circle", q("a", 100), null),
      MarketPulse.row("SPY", "S&P 500", q("a", 100), q("b", 100.01)),
    ];
    const chart = MarketPulse.gapChart(rows);
    expect(chart.bars.map((bar) => bar.ticker)).toEqual(["TSLA", "AAPL", "SPY", "CRCL"]);
    expect(chart.scaleBps).toBe(100);
    expect(chart.bars[0].widthPct).toBeCloseTo(60, 5);
    expect(chart.bars[1].widthPct).toBeCloseTo(20, 5);
    expect(chart.bars[0].offScale).toBe(false);
    expect(chart.bars[3].widthPct).toBe(0);
    expect(chart.bars[3].gapBps).toBeNull();
  });

  it("carries the per-share dollar gap (xStock minus cash) and leaves it null without both prints", () => {
    const chart = MarketPulse.gapChart([
      MarketPulse.row("SPY", "S&P 500", q("a", 773.61), q("b", 777.96)),
      MarketPulse.row("TSLA", "Tesla", q("a", 380.2), q("b", 380.05)),
      MarketPulse.row("CRCL", "Circle", q("a", 94.11), null),
    ]);
    const byTicker = Object.fromEntries(chart.bars.map((bar) => [bar.ticker, bar.gapUsd]));
    expect(byTicker.SPY).toBeCloseTo(4.35, 6);
    expect(byTicker.TSLA).toBeCloseTo(-0.15, 6);
    expect(byTicker.CRCL).toBeNull();
  });

  it("keeps the scale fixed, so one quiet ticker does not draw a full-width bar", () => {
    const chart = MarketPulse.gapChart([MarketPulse.row("SPY", "S&P 500", q("a", 100), q("b", 100.03))]);
    expect(chart.scaleBps).toBe(100);
    expect(chart.bars[0].widthPct).toBeCloseTo(3, 5);
  });

  it("caps a gap wider than 1% at full width and flags it as off-scale instead of stretching the scale", () => {
    const chart = MarketPulse.gapChart([
      MarketPulse.row("MSTR", "Strategy", q("a", 100), q("b", 102.5)),
      MarketPulse.row("SPY", "S&P 500", q("a", 100), q("b", 100.5)),
    ]);
    expect(chart.scaleBps).toBe(100);
    expect(chart.bars[0].ticker).toBe("MSTR");
    expect(chart.bars[0].widthPct).toBe(100);
    expect(chart.bars[0].offScale).toBe(true);
    expect(chart.bars[1].widthPct).toBeCloseTo(50, 5);
    expect(chart.bars[1].offScale).toBe(false);
  });
});

describe("MarketPulse.load", () => {
  it("quotes both legs for every ticker through the injected client", async () => {
    const seen: string[] = [];
    const prices: Record<string, TerminalQuote> = {
      "Equity.US.SPY/USD": q("Equity.US.SPY/USD", 700, 0.5),
      "Crypto.SPYX/USD": q("Crypto.SPYX/USD", 701, 0.6),
      "Equity.US.QQQ/USD": q("Equity.US.QQQ/USD", 600, -1),
    };
    const pulse = await MarketPulse.load({
      tickers: [
        { ticker: "SPY", name: "S&P 500" },
        { ticker: "QQQ", name: "Nasdaq-100" },
      ],
      quote: async (symbol) => {
        seen.push(symbol);
        return prices[symbol] ?? null;
      },
      now: () => 1_000,
    });
    expect(seen.sort()).toEqual(["Crypto.QQQX/USD", "Crypto.SPYX/USD", "Equity.US.QQQ/USD", "Equity.US.SPY/USD"]);
    expect(pulse.fetchedAt).toBe(1_000);
    expect(pulse.rows[0].gapBps).toBeCloseTo(14.29, 1);
    expect(pulse.rows[1].xstock).toBeNull();
    expect(pulse.rows[1].gapBps).toBeNull();
  });

  it("never has more than the concurrency limit of Pyth requests in flight", async () => {
    let inFlight = 0;
    let peak = 0;
    const tickers = Array.from({ length: 12 }, (_, i) => ({ ticker: `T${String.fromCharCode(65 + i)}`, name: "x" }));
    await MarketPulse.load({
      tickers,
      concurrency: 3,
      quote: async (symbol) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 2));
        inFlight -= 1;
        return q(symbol, 100);
      },
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1);
  });

  it("treats a throwing client as an honest empty instead of failing the page", async () => {
    const pulse = await MarketPulse.load({
      tickers: [{ ticker: "SPY", name: "S&P 500" }],
      quote: async () => {
        throw new Error("upstream down");
      },
    });
    expect(pulse.rows[0].cash).toBeNull();
    expect(pulse.rows[0].xstock).toBeNull();
    expect(MarketPulse.isEmpty(pulse)).toBe(true);
  });
});
