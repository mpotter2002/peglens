import { JupiterRouter } from "@/lib/routes/JupiterRouter";
import type { SwapQuote } from "@/lib/types";

export class MeteoraRouter {
  static readonly DEXES = ["Meteora DLMM", "Meteora DAMM v2", "Meteora"] as const;

  static swapUrl(outputMint: string, poolId?: string | null): string {
    if (poolId) {
      return `https://app.meteora.ag/dlmm/${poolId}`;
    }
    return `https://app.meteora.ag/`;
  }

  static isMeteoraHop(label: string): boolean {
    return /meteora/i.test(label);
  }

  static adopt(quote: SwapQuote): SwapQuote {
    const hops = quote.hopLabels.filter(Boolean);
    const meteoraOnly = hops.length > 0 && hops.every((label) => this.isMeteoraHop(label));
    if (!quote.available || !quote.effectiveUsdPerShare || !meteoraOnly) {
      return {
        ...quote,
        venue: "meteora",
        available: false,
        reason: quote.available
          ? "Meteora has no exclusive route for this mint"
          : quote.reason === "Jupiter quote timed out"
            ? "Meteora quote timed out"
            : quote.reason === "Jupiter quote unavailable"
              ? "Meteora has no route for this mint"
              : (quote.reason ?? "Meteora has no route for this mint"),
        outAmountAtomic: null,
        outShares: null,
        effectiveUsdPerShare: null,
        priceImpactPct: null,
        hopLabels: [],
        poolId: null,
        url: this.swapUrl(quote.outMint),
      };
    }
    return {
      ...quote,
      venue: "meteora",
      url: this.swapUrl(quote.outMint, quote.poolId),
    };
  }

  static async quote(params: {
    outputMint: string;
    outDecimals: number;
    inAtomic: string;
  }): Promise<SwapQuote> {
    const viaJupiter = await JupiterRouter.quote({
      ...params,
      dexes: [...this.DEXES],
    });
    return this.adopt(viaJupiter);
  }
}
