import { describe, expect, it } from "vitest";
import { BoardComposer } from "@/lib/board/BoardComposer";
import { BoardView } from "@/lib/ui/BoardView";
import { RouteBoard } from "@/lib/routes/RouteBoard";
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
    expect(BoardView.routeKicker(board)).toBe("No swap CTA");
    expect(BoardView.routeStory(board)).toMatch(/will not invent a pool/);
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

  it("sorts live quotes cheapest-first and only badges a compared winner", () => {
    const card = RouteBoard.card({
      kind: "xstock",
      label: "TSLAx",
      mint: "mint",
      decimals: 8,
      quotes: [
        quote({ venue: "raydium", available: true, effectiveUsdPerShare: 366.17, hopLabels: ["Raydium"] }),
        quote({ venue: "meteora", available: true, effectiveUsdPerShare: 366.4, hopLabels: ["Meteora DLMM"] }),
        quote({ venue: "jupiter", available: true, effectiveUsdPerShare: 365.51, hopLabels: ["Riptide"] }),
      ],
    });
    expect(BoardView.sortedQuotes(card).map((row) => row.venue)).toEqual(["jupiter", "raydium", "meteora"]);
    expect(BoardView.marksCheapest(card, card.quotes[2]!)).toBe(true);
    expect(BoardView.marksCheapest(card, card.quotes[0]!)).toBe(false);
  });

  it("only labels the route cheapest when quotes actually compare", () => {
    const cheapest = board({
      cheapestHonest: {
        wrapper: "xstock",
        venue: "jupiter",
        effectiveUsdPerShare: 365.51,
        vsEquityBps: -5.7,
        headline: "Buy TSLAx on Jupiter",
        ctaLabel: "Open Jupiter swap",
        ctaUrl: "https://jup.ag/swap/TSLA",
        caveat: "Indicative quote",
        claimCheapest: true,
      },
    });
    const venueOnly = board({
      cheapestHonest: {
        wrapper: "xstock",
        venue: "raydium",
        effectiveUsdPerShare: 337.75,
        vsEquityBps: 42,
        headline: "Trade AAPLx on Raydium",
        ctaLabel: "Open Raydium swap",
        ctaUrl: "https://raydium.io/swap",
        caveat: "Not a cheapest claim",
        claimCheapest: false,
      },
    });
    expect(BoardView.routeKicker(cheapest)).toBe("Cheapest honest route");
    expect(BoardView.routeHeadline(cheapest)).toBe("Buy TSLAx on Jupiter");
    expect(BoardView.routeStory(cheapest)).toMatch(/Cheapest is first/i);
    expect(BoardView.ctaLabel(cheapest)).toBe("Open Jupiter swap");
    expect(BoardView.routeKicker(venueOnly)).toBe("Trade on Raydium");
    expect(BoardView.routeStory(venueOnly)).toMatch(/not a cheapest claim/i);
  });

  it("labels the company from Pyth name, then the demo catalog, never a fake print", () => {
    expect(BoardView.companyLabel(board({ ticker: "AAPL", name: "APPLE INC" }))).toBe("APPLE INC");
    expect(BoardView.companyLabel(board({ ticker: "AAPL", name: "AAPL" }))).toBe("Apple");
    expect(BoardView.companyLabel(board({ ticker: "ZZZZ", name: "ZZZZ" }))).toBe("ZZZZ");
  });

  it("keeps last-cash-print context honest when the session is shut", () => {
    const printed = board({
      session: { ...BoardComposer.unavailable("AAPL").session, cashOpen: false, afterHoursNarrative: true },
      equity: mark({ kind: "equity", priceUsd: 190.12 }),
    });
    const empty = board({
      session: { ...BoardComposer.unavailable("AAPL").session, cashOpen: false, afterHoursNarrative: true },
      equity: mark({ kind: "equity", priceUsd: null }),
    });
    expect(BoardView.cashPrintContext(printed)).toMatch(/last print/i);
    expect(BoardView.cashPrintContext(empty)).toMatch(/will not invent/);
  });

  it("surfaces feed metadata without inventing a tick", () => {
    const live = mark({
      kind: "equity",
      feedId: "abcdef0123456789deadbeef",
      publishTime: 1_700_000_000,
      confidenceUsd: 0.04,
      source: "hermes",
    });
    const missing = mark({ kind: "xstock", feedId: null, symbol: "—" });
    expect(BoardView.markFeedLine(live)).toMatch(/0xabcdef01/);
    expect(BoardView.markFeedLine(live)).toMatch(/conf/);
    expect(BoardView.markFeedLine(missing)).toBe("No Pyth feed id");
    expect(BoardView.markSymbolLine(live)).toMatch(/AAPL\/USD/);
  });

  it("keeps wrapper identity empty when no mint resolved", () => {
    const empty = BoardComposer.unavailable("ZZZZ").routes[0]!;
    expect(BoardView.wrapperMintLine(empty)).toMatch(/No Solana mint resolved/);
    expect(BoardView.wrapperIdentityTitle(empty)).toBe("ZZZZx");
    expect(BoardView.inventorySourceLabel(null)).toBeNull();
    expect(BoardView.inventorySourceLabel("xstocks")).toMatch(/xStocks/);
  });

  it("only adds a cash-close hint while the session is open, so after-hours copy is not repeated", () => {
    const base = BoardComposer.unavailable("AAPL").session;
    const closed = board({
      session: { ...base, cashOpen: false, afterHoursNarrative: true, nextOpen: 1_800_000_000 },
    });
    expect(BoardView.nextSessionHint(closed)).toBeNull();
    const open = board({
      session: {
        ...base,
        cashOpen: true,
        afterHoursNarrative: false,
        nextClose: 1_800_000_000,
        detail: "NYSE/Nasdaq regular session · 09:30–16:00 ET.",
      },
    });
    expect(BoardView.nextSessionHint(open)).toMatch(/Cash close/);
  });

  it("explains the peg and the page without promising fills", () => {
    expect(BoardView.pegGuide("AAPL")[0]).toMatch(/Equity\.US\.AAPL\/USD/);
    expect(BoardView.pageHonesty()).toMatch(/will not invent/);
    expect(BoardView.homeIntro()).toMatch(/No invented prices/);
  });
});

function mark(partial: Partial<BoardMark> & Pick<BoardMark, "kind">): BoardMark {
  return {
    label: partial.kind === "equity" ? "Broker / cash" : "xStock",
    issuer: "test",
    symbol: "Equity.US.AAPL/USD",
    displaySymbol: "AAPL/USD",
    description: "APPLE INC",
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
