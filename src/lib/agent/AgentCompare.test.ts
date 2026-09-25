import { describe, expect, it } from "vitest";
import { AgentCompare } from "@/lib/agent/AgentCompare";
import { BoardComposer } from "@/lib/board/BoardComposer";
import { RouteBoard } from "@/lib/routes/RouteBoard";
import type { BoardMark, BoardPayload, SessionSnapshot, SwapQuote } from "@/lib/types";

const NOW_MS = Date.UTC(2026, 8, 24, 18, 0); // 2:00 PM ET, regular session
const NOW_S = NOW_MS / 1000;

const OPEN: SessionSnapshot = {
  name: "regular",
  cashOpen: true,
  pythEquityOpen: true,
  nextOpen: null,
  nextClose: null,
  label: "US cash open",
  detail: "Regular session.",
  afterHoursNarrative: false,
};
const CLOSED: SessionSnapshot = { ...OPEN, name: "after-hours", cashOpen: false, pythEquityOpen: false, label: "After hours", afterHoursNarrative: true };

function mark(kind: BoardMark["kind"], partial: Partial<BoardMark> = {}): BoardMark {
  return {
    kind,
    label: kind === "equity" ? "Broker / cash" : kind === "xstock" ? "xStock" : "Ondo",
    issuer: kind === "equity" ? "US listed equity" : kind === "xstock" ? "Backed / xStocks" : "Ondo Global Markets",
    symbol: kind === "equity" ? "Equity.US.AAPL/USD" : kind === "xstock" ? "Crypto.AAPLX/USD" : "Crypto.AAPLON/USD",
    displaySymbol: null,
    description: null,
    feedId: `0x${kind}`,
    priceUsd: null,
    confidenceUsd: null,
    publishTime: null,
    source: "unavailable",
    live: false,
    note: null,
    ...partial,
  };
}

function quote(partial: Partial<SwapQuote> & Pick<SwapQuote, "venue" | "available">): SwapQuote {
  return {
    reason: null,
    inMint: "usdc",
    outMint: "x-mint",
    inAmountAtomic: "100000000",
    outAmountAtomic: partial.available ? "1" : null,
    inDecimals: 6,
    outDecimals: 8,
    inUsd: 100,
    outShares: partial.available ? 0.3 : null,
    effectiveUsdPerShare: null,
    priceImpactPct: partial.available ? 0.02 : null,
    hopLabels: [],
    poolId: null,
    url: null,
    ...partial,
  };
}

/** A full AAPL board: Hermes-timestamped marks, xStock quoted on two venues, Ondo mint unresolved. */
function fullBoard(overrides: Partial<BoardPayload> = {}): BoardPayload {
  const equity = mark("equity", { priceUsd: 300, publishTime: NOW_S - 10, source: "hermes", live: true });
  const xstock = mark("xstock", { priceUsd: 303, publishTime: NOW_S - 5, source: "hermes", live: true });
  const ondo = mark("ondo", { note: "Pyth does not list this feed." });
  const routes = [
    RouteBoard.card({
      kind: "xstock",
      label: "AAPLx",
      mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
      decimals: 8,
      name: "Apple xStock",
      nameSource: "xstocks",
      quotes: [
        quote({ venue: "raydium", available: true, effectiveUsdPerShare: 304.5, url: "https://raydium.io/swap" }),
        quote({ venue: "jupiter", available: true, effectiveUsdPerShare: 303.9, url: "https://jup.ag/swap" }),
        quote({ venue: "meteora", available: false, reason: "No Meteora pool for this mint" }),
      ],
    }),
    RouteBoard.card({ kind: "ondo", label: "AAPLon", mint: null, decimals: null, quotes: [] }),
  ];
  const base = BoardComposer.unavailable("AAPL");
  return {
    ...base,
    name: "Apple Inc",
    fetchedAt: NOW_MS,
    session: OPEN,
    equity,
    wrappers: [
      { ...xstock, peg: { bps: 100, pct: 1, dollars: 3, sign: "premium" } },
      { ...ondo, peg: { bps: null, pct: null, dollars: null, sign: "unavailable" } },
    ],
    routes,
    cheapestHonest: BoardComposer.honestRoute(routes, 300),
    warnings: [],
    ...overrides,
  };
}

describe("AgentCompare.parseTicker", () => {
  it("accepts 1-6 letters in any case and uppercases them", () => {
    expect(AgentCompare.parseTicker(" aapl ")).toEqual({ ok: true, ticker: "AAPL" });
  });

  it("rejects malformed input instead of silently swapping in a default ticker", () => {
    for (const bad of ["", "!!!", "TOOLONGX", "AA1", null, 42]) {
      const parsed = AgentCompare.parseTicker(bad);
      expect(parsed.ok).toBe(false);
    }
  });
});

describe("AgentCompare.tickers", () => {
  it("lists the curated desk tickers with names and their Pyth/wrapper symbols", () => {
    const list = AgentCompare.tickers();
    expect(list.tickers.map((t) => t.ticker)).toContain("AAPL");
    expect(list.tickers).toHaveLength(12);
    const aapl = list.tickers.find((t) => t.ticker === "AAPL");
    expect(aapl).toMatchObject({ name: "Apple", cashFeed: "Equity.US.AAPL/USD", xstock: "AAPLx", ondo: "AAPLon" });
    expect(list.note).toMatch(/any 1-6 letter US ticker/i);
  });
});

describe("AgentCompare.fromBoard", () => {
  it("reuses the board's peg and exposes identity, source and freshness for every leg", () => {
    const out = AgentCompare.fromBoard(fullBoard(), NOW_MS);
    expect(out.ticker).toBe("AAPL");
    expect(out.status).toBe("ok");
    expect(out.observedAt).toBe(new Date(NOW_MS).toISOString());

    expect(out.cash).toMatchObject({
      priceUsd: 300,
      status: "regular_session",
      source: "pyth-hermes",
      feedSymbol: "Equity.US.AAPL/USD",
      freshness: { kind: "timestamped", ageSeconds: 10, stale: false },
    });

    const x = out.wrappers.find((w) => w.kind === "xstock");
    expect(x).toMatchObject({
      symbol: "AAPLx",
      priceUsd: 303,
      vsCash: { pct: 1, dollars: 3, direction: "premium" },
      identity: { mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp", decimals: 8, name: "Apple xStock", nameSource: "xstocks-public-inventory" },
    });
  });

  it("keeps a missing wrapper as nulls with a reason, never a zero", () => {
    const out = AgentCompare.fromBoard(fullBoard(), NOW_MS);
    const ondo = out.wrappers.find((w) => w.kind === "ondo");
    expect(ondo?.priceUsd).toBeNull();
    expect(ondo?.vsCash).toBeNull();
    expect(ondo?.identity.mint).toBeNull();
    expect(ondo?.missing).toMatch(/Pyth does not list this feed/);
    expect(ondo?.freshness.kind).toBe("none");
  });

  it("labels a closed-session cash price as a last cash print, not a live quote", () => {
    const out = AgentCompare.fromBoard(fullBoard({ session: CLOSED }), NOW_MS);
    expect(out.cash.status).toBe("last_cash_print");
    expect(out.session).toMatchObject({ name: "after-hours", cashOpen: false });
    expect(out.notes.join(" ")).toMatch(/last cash print/i);
  });

  it("flags a timestamped mark older than the stale window", () => {
    const board = fullBoard();
    board.equity = { ...board.equity, publishTime: NOW_S - 3_600 };
    const out = AgentCompare.fromBoard(board, NOW_MS);
    expect(out.cash.freshness).toEqual({ kind: "timestamped", publishedAt: new Date((NOW_S - 3_600) * 1000).toISOString(), ageSeconds: 3_600, stale: true });
  });

  it("marks Pyth Terminal prices as untimed snapshots, never as timestamped ticks", () => {
    const board = fullBoard();
    board.equity = { ...board.equity, source: "pyth-terminal", publishTime: null };
    const out = AgentCompare.fromBoard(board, NOW_MS);
    expect(out.cash.source).toBe("pyth-terminal-snapshot");
    expect(out.cash.freshness).toEqual({ kind: "untimed_snapshot", publishedAt: null, ageSeconds: null, stale: null });
  });

  it("reports venue quotes as comparable only when two or more venues priced, and says why a venue is missing", () => {
    const out = AgentCompare.fromBoard(fullBoard(), NOW_MS);
    expect(out.venues.quoteSizeUsd).toBe(100);
    expect(out.venues.comparable).toBe(true);
    expect(out.venues.cheapest).toMatchObject({ wrapper: "xstock", venue: "jupiter", effectiveUsdPerShare: 303.9, claimCheapest: true });
    const meteora = out.venues.quotes.find((q) => q.venue === "meteora");
    expect(meteora).toMatchObject({ available: false, effectiveUsdPerShare: null, reason: "No Meteora pool for this mint" });
    const jupiter = out.venues.quotes.find((q) => q.venue === "jupiter");
    expect(jupiter?.vsCashPct).toBeCloseTo(1.3, 5);
  });

  it("does not call a single venue quote comparable", () => {
    const board = fullBoard();
    const single = RouteBoard.card({
      kind: "xstock",
      label: "AAPLx",
      mint: "m",
      decimals: 8,
      quotes: [quote({ venue: "raydium", available: true, effectiveUsdPerShare: 304 })],
    });
    board.routes = [single, board.routes[1]];
    board.cheapestHonest = BoardComposer.honestRoute(board.routes, 300);
    const out = AgentCompare.fromBoard(board, NOW_MS);
    expect(out.venues.comparable).toBe(false);
    expect(out.venues.cheapest?.claimCheapest).toBe(false);
  });

  it("returns status partial when wrappers print but there is no cash mark to compare against", () => {
    const board = fullBoard();
    board.equity = { ...board.equity, priceUsd: null, publishTime: null, source: "unavailable", live: false, note: "Feed exists but no public price tick landed." };
    board.wrappers = board.wrappers.map((w: BoardPayload["wrappers"][number]) => ({ ...w, peg: { bps: null, pct: null, dollars: null, sign: "unavailable" as const } }));
    const out = AgentCompare.fromBoard(board, NOW_MS);
    expect(out.status).toBe("partial");
    expect(out.cash.status).toBe("unavailable");
    expect(out.cash.missing).toMatch(/no public price tick/);
    expect(out.wrappers.find((w) => w.kind === "xstock")?.priceUsd).toBe(303);
    expect(out.wrappers.every((w) => w.vsCash === null)).toBe(true);
  });

  it("returns status no_data for an unknown ticker with every price null", () => {
    const board = BoardComposer.unavailable("ZZZZ", "Live venues did not return a print.");
    const out = AgentCompare.fromBoard(board, NOW_MS);
    expect(out.status).toBe("no_data");
    expect(out.curated).toBe(false);
    expect(out.cash.priceUsd).toBeNull();
    expect(out.cash.status).toBe("unavailable");
    expect(out.wrappers.every((w) => w.priceUsd === null && w.vsCash === null)).toBe(true);
    expect(out.venues.cheapest).toBeNull();
    expect(out.venues.comparable).toBe(false);
  });

  it("never carries a day-change or rolling-24h field, and always states it is read-only", () => {
    const out = AgentCompare.fromBoard(fullBoard(), NOW_MS);
    const json = JSON.stringify(out);
    expect(json).not.toMatch(/changePct|24h|previousClose/i);
    expect(out.notes.join(" ")).toMatch(/read-only/i);
    expect(out.notes.join(" ")).toMatch(/not investment advice/i);
  });
});
