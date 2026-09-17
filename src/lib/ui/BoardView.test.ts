import { describe, expect, it } from "vitest";
import { BoardComposer } from "@/lib/board/BoardComposer";
import { BoardView } from "@/lib/ui/BoardView";
import type { BoardMark, BoardPayload, PegVsEquity, SwapQuote } from "@/lib/types";

describe("BoardView", () => {
  it("keeps last-cash-print honest: only cash, only when closed, only when a print exists", () => {
    const cash = mark({ kind: "equity", priceUsd: 100 });
    const emptyCash = mark({ kind: "equity", priceUsd: null });
    const wrapper = mark({ kind: "xstock", priceUsd: 101 });
    expect(BoardView.lastCashPrint(cash, true)).toBe(true);
    expect(BoardView.lastCashPrint(cash, false)).toBe(false);
    expect(BoardView.lastCashPrint(emptyCash, true)).toBe(false);
    expect(BoardView.lastCashPrint(wrapper, true)).toBe(false);
    expect(BoardView.sourceOrSession(cash, true)).toBe("Last cash print");
    expect(BoardView.sourceOrSession(emptyCash, true)).toBe("pyth-terminal");
  });

  it("does not invent peg copy", () => {
    expect(BoardView.pegCopy(null)).toMatch(/Reference mark/);
    expect(BoardView.pegCopy(null, true)).toBe("Reference");
    expect(BoardView.pegCopy(peg({ sign: "unavailable", bps: null, dollars: null }))).toBe("No peg yet");
    expect(BoardView.pegCopy(peg({ sign: "flat", bps: 1.2, dollars: 0.04 }))).toMatch(/In line/);
    expect(BoardView.pegCopy(peg({ sign: "premium", bps: 32, dollars: 1.08 }))).toMatch(/vs cash/);
    expect(BoardView.pegTone(peg({ sign: "discount", bps: -12, dollars: -0.4 }))).toBe("discount");
    expect(BoardView.pegTone(null)).toBe("muted");
  });

  it("keeps table rows quiet: no repeated Terminal boilerplate, no invented meta", () => {
    const snapshot = mark({
      kind: "equity",
      note: "Pyth Terminal public snapshot. Set PYTH_API_KEY for signed Hermes ticks.",
    });
    const missing = mark({ kind: "xstock", priceUsd: null, note: "Pyth does not list this feed." });
    expect(BoardView.rowNote(snapshot)).toBeNull();
    expect(BoardView.rowNote(missing)).toBe("Pyth does not list this feed.");
    expect(BoardView.printMeta(snapshot)).toBe("snapshot");
    expect(BoardView.printMeta(missing)).toBe("No print");
  });

  it("uses the same empty-state copy as the desk", () => {
    const board = BoardComposer.unavailable("ZZZZ", "Venues unreachable.");
    expect(BoardView.noLivePrints(board)).toBe(true);
    expect(BoardView.emptyTitle()).toBe("No live prints");
    expect(BoardView.emptyBody("ZZZZ")).toMatch(/will not invent a price/);
    expect(BoardView.routeHeadline(board)).toMatch(/will not invent a pool/);
    expect(BoardView.ctaLabel(board)).toBeNull();
    expect(BoardView.emptyQuotes()).toMatch(/not a simulated fill/);
  });

  it("captions the cash hero without inventing a print", () => {
    expect(BoardView.heroCaption(mark({ kind: "equity", priceUsd: null }))).toBe("No cash print");
    expect(BoardView.heroCaption(mark({ kind: "equity", priceUsd: 333.2, source: "pyth-terminal" }))).toBe(
      "Broker / cash · terminal snapshot",
    );
  });

  it("labels Pyth source without implying a fill", () => {
    const hermes = board({ pythKeyConfigured: true });
    const terminal = board({ pythKeyConfigured: false });
    expect(BoardView.sourceCaption(hermes)).toBe("Pyth Hermes");
    expect(BoardView.sourceCaption(terminal)).toBe("Pyth Terminal snapshot");
    expect(BoardView.quoteSizeCaption(terminal)).toMatch(/never execute/);
  });

  it("formats venue quotes without inventing hops", () => {
    const live: SwapQuote = quote({ available: true, effectiveUsdPerShare: 334.44, hopLabels: ["Raydium"] });
    const miss: SwapQuote = quote({
      available: false,
      effectiveUsdPerShare: null,
      reason: "Raydium has no route for this mint",
      hopLabels: [],
    });
    expect(BoardView.quoteLine(live)).toBe("$334.44 · Raydium");
    expect(BoardView.quoteLine(miss)).toBe("Raydium has no route for this mint");
  });
});

function mark(partial: Partial<BoardMark> & Pick<BoardMark, "kind">): BoardMark {
  return {
    label: partial.kind === "equity" ? "Broker / cash" : "xStock",
    issuer: "test",
    symbol: "Equity.US.AAPL/USD",
    feedId: null,
    priceUsd: 100,
    confidenceUsd: null,
    publishTime: null,
    source: "pyth-terminal",
    live: false,
    note: null,
    ...partial,
  };
}

function peg(partial: Partial<PegVsEquity> & Pick<PegVsEquity, "sign">): PegVsEquity {
  return { bps: null, pct: null, dollars: null, ...partial };
}

function quote(partial: Partial<SwapQuote>): SwapQuote {
  return {
    venue: "raydium",
    available: false,
    reason: null,
    inMint: "usdc",
    outMint: "mint",
    inAmountAtomic: "100000000",
    outAmountAtomic: null,
    inDecimals: 6,
    outDecimals: 8,
    inUsd: 100,
    outShares: null,
    effectiveUsdPerShare: null,
    priceImpactPct: null,
    hopLabels: [],
    poolId: null,
    url: null,
    ...partial,
  };
}

function board(partial: Partial<BoardPayload>): BoardPayload {
  return {
    ...BoardComposer.unavailable("AAPL"),
    ...partial,
  };
}
