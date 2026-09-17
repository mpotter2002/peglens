import { describe, expect, it } from "vitest";
import { MeteoraRouter } from "@/lib/routes/MeteoraRouter";
import type { SwapQuote } from "@/lib/types";

function quote(partial: Partial<SwapQuote>): SwapQuote {
  return {
    venue: "jupiter",
    available: true,
    reason: null,
    inMint: "usdc",
    outMint: "mint",
    inAmountAtomic: "100000000",
    outAmountAtomic: "1",
    inDecimals: 6,
    outDecimals: 8,
    inUsd: 100,
    outShares: 0.29,
    effectiveUsdPerShare: 341.2,
    priceImpactPct: 0.02,
    hopLabels: ["Meteora DLMM"],
    poolId: "pool",
    url: "https://jup.ag/swap/USDC-mint",
    ...partial,
  };
}

describe("MeteoraRouter.adopt", () => {
  it("keeps a Meteora-only hop as a real Meteora quote", () => {
    const adopted = MeteoraRouter.adopt(quote({ hopLabels: ["Meteora DLMM", "Meteora DAMM v2"] }));
    expect(adopted.available).toBe(true);
    expect(adopted.venue).toBe("meteora");
    expect(adopted.effectiveUsdPerShare).toBe(341.2);
    expect(adopted.url).toContain("app.meteora.ag");
  });

  it("does not invent a Meteora quote from mixed or missing hops", () => {
    const mixed = MeteoraRouter.adopt(quote({ hopLabels: ["Meteora DLMM", "Raydium CLMM"] }));
    const empty = MeteoraRouter.adopt(quote({ hopLabels: [] }));
    expect(mixed.available).toBe(false);
    expect(mixed.effectiveUsdPerShare).toBeNull();
    expect(mixed.reason).toMatch(/no exclusive route/i);
    expect(empty.available).toBe(false);
  });
});
