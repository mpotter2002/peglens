import type { SwapQuote, WrapperKind, WrapperRouteCard } from "@/lib/types";

export class RouteBoard {
  static card(params: {
    kind: WrapperKind;
    label: string;
    mint: string | null;
    decimals: number | null;
    quotes: SwapQuote[];
  }): WrapperRouteCard {
    const live = params.quotes.filter((quote) => quote.available && quote.effectiveUsdPerShare);
    const cheapest = live.slice().sort((a, b) => (a.effectiveUsdPerShare ?? Infinity) - (b.effectiveUsdPerShare ?? Infinity))[0] ?? null;
    const raydium = live.find((quote) => quote.venue === "raydium") ?? null;
    const raydiumIsCheapest =
      raydium && cheapest ? raydium.venue === cheapest.venue || this.withinBps(raydium, cheapest, 1) : null;
    const featured = raydiumIsCheapest && raydium ? raydium : cheapest;
    return {
      kind: params.kind,
      label: params.label,
      mint: params.mint,
      decimals: params.decimals,
      quotes: params.quotes,
      featured,
      cheapest,
      raydiumIsCheapest,
      honesty: this.honesty({ mint: params.mint, quotes: params.quotes, featured, cheapest, raydium, raydiumIsCheapest }),
    };
  }

  static withinBps(a: SwapQuote, b: SwapQuote, bps: number): boolean {
    if (!a.effectiveUsdPerShare || !b.effectiveUsdPerShare) {
      return false;
    }
    const delta = Math.abs(a.effectiveUsdPerShare - b.effectiveUsdPerShare) / b.effectiveUsdPerShare;
    return delta * 10_000 <= bps;
  }

  static honesty(params: {
    mint: string | null;
    quotes: SwapQuote[];
    featured: SwapQuote | null;
    cheapest: SwapQuote | null;
    raydium: SwapQuote | null;
    raydiumIsCheapest: boolean | null;
  }): string {
    if (!params.mint) {
      return "No Solana mint resolved — no swap route to quote.";
    }
    const raydiumMiss = params.quotes.find((quote) => quote.venue === "raydium" && !quote.available);
    const jupiter = params.quotes.find((quote) => quote.venue === "jupiter" && quote.available) ?? null;
    if (!params.featured) {
      return raydiumMiss?.reason || "No executable route from Raydium or Jupiter for this size.";
    }
    if (params.raydium && params.cheapest && params.cheapest.venue === "raydium") {
      if (!jupiter) {
        return "Raydium quoted this size. PegLens did not get a second venue to compare — not a cheapest claim.";
      }
      if (this.jupiterIsRaydium(jupiter)) {
        return "Raydium is the cheapest venue. Jupiter’s quote is the same Raydium CLMM hop.";
      }
      return "Raydium is the cheapest executable venue at this size.";
    }
    if (params.raydium && params.cheapest && params.cheapest.venue !== "raydium") {
      const extra = this.deltaBps(params.raydium, params.cheapest);
      return `Jupiter is cheaper by ${extra} bps. Raydium still has a live pool — PegLens will not hide that.`;
    }
    if (!params.raydium && jupiter) {
      const hops = jupiter.hopLabels.join(" → ") || "aggregator hops";
      return `Raydium has no pool. Secondary quote: Jupiter via ${hops}. Indicative only — not a fill.`;
    }
    return "Indicative quotes only. PegLens does not send transactions.";
  }

  static jupiterIsRaydium(quote: SwapQuote): boolean {
    return quote.hopLabels.length > 0 && quote.hopLabels.every((label) => /raydium/i.test(label));
  }

  static deltaBps(expensive: SwapQuote, cheap: SwapQuote): string {
    if (!expensive.effectiveUsdPerShare || !cheap.effectiveUsdPerShare) {
      return "—";
    }
    const bps = ((expensive.effectiveUsdPerShare - cheap.effectiveUsdPerShare) / cheap.effectiveUsdPerShare) * 10_000;
    return Math.abs(bps).toFixed(1);
  }
}
