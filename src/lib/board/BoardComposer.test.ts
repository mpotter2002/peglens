import { describe, expect, it } from "vitest";
import { BoardComposer } from "@/lib/board/BoardComposer";
import { RouteBoard } from "@/lib/routes/RouteBoard";
import type { SwapQuote } from "@/lib/types";

describe("BoardComposer.unavailable", () => {
  it("returns honest empty cells instead of invented marks or fills", () => {
    const board = BoardComposer.unavailable("AAPL", "Venues unreachable.");
    expect(board.ticker).toBe("AAPL");
    expect(board.equity.priceUsd).toBeNull();
    expect(board.wrappers.every((wrapper) => wrapper.priceUsd === null)).toBe(true);
    expect(board.cheapestHonest).toBeNull();
    expect(board.routes.every((route) => route.featured === null)).toBe(true);
    expect(board.warnings[0]).toMatch(/Venues unreachable/);
    expect(BoardComposer.isEmpty(board)).toBe(true);
  });
});

describe("BoardComposer.honestRoute", () => {
  it("links the desk CTA to the cheapest quoted venue, not Raydium-by-default", () => {
    const xstock = RouteBoard.card({
      kind: "xstock",
      label: "TSLAx",
      mint: "x-mint",
      decimals: 8,
      quotes: [
        quote({ venue: "raydium", available: true, effectiveUsdPerShare: 366.17, url: "https://raydium.io/swap" }),
        quote({ venue: "jupiter", available: true, effectiveUsdPerShare: 365.51, url: "https://jup.ag/swap/TSLA" }),
      ],
    });
    const ondo = RouteBoard.card({
      kind: "ondo",
      label: "TSLAon",
      mint: "on-mint",
      decimals: 9,
      quotes: [
        quote({
          venue: "raydium",
          available: false,
          effectiveUsdPerShare: null,
          reason: "Raydium has no route for this mint",
        }),
      ],
    });
    const cta = BoardComposer.honestRoute([xstock, ondo], 365.72);
    expect(cta?.venue).toBe("jupiter");
    expect(cta?.claimCheapest).toBe(true);
    expect(cta?.headline).toBe("Buy TSLAx on Jupiter");
    expect(cta?.ctaLabel).toBe("Open Jupiter swap");
    expect(cta?.ctaUrl).toBe("https://jup.ag/swap/TSLA");
  });

  it("keeps a Raydium CTA when Raydium wins or ties on price", () => {
    const xstock = RouteBoard.card({
      kind: "xstock",
      label: "AAPLx",
      mint: "x-mint",
      decimals: 8,
      quotes: [
        quote({ venue: "raydium", available: true, effectiveUsdPerShare: 337.75, url: "https://raydium.io/aapl" }),
        quote({ venue: "jupiter", available: true, effectiveUsdPerShare: 337.75, url: "https://jup.ag/aapl" }),
      ],
    });
    const cta = BoardComposer.honestRoute([xstock], 336.33);
    expect(cta?.venue).toBe("raydium");
    expect(cta?.claimCheapest).toBe(true);
    expect(cta?.headline).toBe("Buy AAPLx on Raydium");
    expect(cta?.ctaUrl).toBe("https://raydium.io/aapl");
  });

  it("does not claim cheapest when only one venue quoted", () => {
    const xstock = RouteBoard.card({
      kind: "xstock",
      label: "AAPLx",
      mint: "x-mint",
      decimals: 8,
      quotes: [
        quote({ venue: "raydium", available: true, effectiveUsdPerShare: 337.75, url: "https://raydium.io/aapl" }),
      ],
    });
    const cta = BoardComposer.honestRoute([xstock], 336.33);
    expect(cta?.venue).toBe("raydium");
    expect(cta?.claimCheapest).toBe(false);
    expect(cta?.headline).toBe("Trade AAPLx on Raydium");
    expect(cta?.ctaLabel).toBe("Open Raydium swap");
    expect(cta?.caveat).toMatch(/Not a cheapest claim/i);
  });
});

function quote(partial: Partial<SwapQuote> & Pick<SwapQuote, "venue" | "available">): SwapQuote {
  return {
    reason: null,
    inMint: "usdc",
    outMint: "mint",
    inAmountAtomic: "100000000",
    outAmountAtomic: partial.available ? "1" : null,
    inDecimals: 6,
    outDecimals: 8,
    inUsd: 100,
    outShares: partial.available ? 0.3 : null,
    effectiveUsdPerShare: null,
    priceImpactPct: 0.02,
    hopLabels: partial.venue === "raydium" ? ["Raydium"] : ["Jupiter"],
    poolId: "pool",
    url: null,
    ...partial,
  };
}
