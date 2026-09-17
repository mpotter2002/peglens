import { describe, expect, it } from "vitest";
import { RouteBoard } from "@/lib/routes/RouteBoard";
import type { SwapQuote } from "@/lib/types";

function quote(partial: Partial<SwapQuote> & Pick<SwapQuote, "venue" | "available" | "effectiveUsdPerShare">): SwapQuote {
  return {
    reason: null,
    inMint: "usdc",
    outMint: "mint",
    inAmountAtomic: "100000000",
    outAmountAtomic: "1",
    inDecimals: 6,
    outDecimals: 8,
    inUsd: 100,
    outShares: 0.3,
    priceImpactPct: 0.02,
    hopLabels: partial.venue === "raydium" ? ["Raydium"] : ["Raydium CLMM"],
    poolId: "pool",
    url: "https://example.com",
    ...partial,
  };
}

describe("RouteBoard", () => {
  it("features Raydium when it is the cheapest executable venue", () => {
    const card = RouteBoard.card({
      kind: "xstock",
      label: "AAPLx",
      mint: "mint",
      decimals: 8,
      quotes: [
        quote({ venue: "raydium", available: true, effectiveUsdPerShare: 333.71, hopLabels: ["Raydium"] }),
        quote({ venue: "jupiter", available: true, effectiveUsdPerShare: 333.71, hopLabels: ["Raydium CLMM"] }),
      ],
    });
    expect(card.featured?.venue).toBe("raydium");
    expect(card.cheapest?.venue).toBe("raydium");
    expect(card.honesty).toMatch(/same Raydium/i);
  });

  it("features Jupiter when it is cheaper and does not pretend Raydium won", () => {
    const card = RouteBoard.card({
      kind: "xstock",
      label: "TSLAx",
      mint: "mint",
      decimals: 8,
      quotes: [
        quote({ venue: "raydium", available: true, effectiveUsdPerShare: 366.17, hopLabels: ["Raydium"], url: "https://raydium.io/tsla" }),
        quote({ venue: "jupiter", available: true, effectiveUsdPerShare: 365.69, hopLabels: ["Meteora DLMM"], url: "https://jup.ag/tsla" }),
      ],
    });
    expect(card.featured?.venue).toBe("jupiter");
    expect(card.cheapest?.venue).toBe("jupiter");
    expect(card.featured?.url).toBe("https://jup.ag/tsla");
    expect(card.raydiumIsCheapest).toBe(false);
    expect(card.honesty).toMatch(/Jupiter is cheaper than Raydium/i);
  });

  it("does not call a lone Raydium quote the cheapest venue", () => {
    const card = RouteBoard.card({
      kind: "xstock",
      label: "AAPLx",
      mint: "mint",
      decimals: 8,
      quotes: [
        quote({ venue: "raydium", available: true, effectiveUsdPerShare: 333.71, hopLabels: ["Raydium"] }),
        quote({
          venue: "jupiter",
          available: false,
          effectiveUsdPerShare: null,
          reason: "Jupiter quote timed out",
          hopLabels: [],
        }),
      ],
    });
    expect(card.featured?.venue).toBe("raydium");
    expect(card.honesty).toMatch(/not a cheapest claim/i);
  });

  it("says so when Raydium has no pool", () => {
    const card = RouteBoard.card({
      kind: "ondo",
      label: "AAPLon",
      mint: "ondo-mint",
      decimals: 9,
      quotes: [
        quote({
          venue: "raydium",
          available: false,
          effectiveUsdPerShare: null,
          reason: "Raydium has no route for this mint",
          hopLabels: [],
        }),
        quote({
          venue: "jupiter",
          available: true,
          effectiveUsdPerShare: 351.09,
          hopLabels: ["Meteora DLMM"],
        }),
      ],
    });
    expect(card.featured?.venue).toBe("jupiter");
    expect(card.honesty).toMatch(/Raydium has no pool/i);
    expect(card.honesty).toMatch(/not a cheapest claim/i);
  });

  it("does not invent a route when nothing quotes", () => {
    const card = RouteBoard.card({
      kind: "xstock",
      label: "NOnex",
      mint: null,
      decimals: null,
      quotes: [],
    });
    expect(card.featured).toBeNull();
    expect(card.honesty).toMatch(/No Solana mint/i);
  });
});
