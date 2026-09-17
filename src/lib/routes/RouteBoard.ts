import type { RouteVenue, SwapQuote, WrapperKind, WrapperRouteCard } from "@/lib/types";

export class RouteBoard {
  static venueTitle(venue: RouteVenue): string {
    if (venue === "raydium") {
      return "Raydium";
    }
    if (venue === "jupiter") {
      return "Jupiter";
    }
    if (venue === "meteora") {
      return "Meteora";
    }
    return "dFlow";
  }

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
    const live = params.quotes.filter((quote) => quote.available && quote.effectiveUsdPerShare);
    const raydiumMiss = params.quotes.find((quote) => quote.venue === "raydium" && !quote.available);
    const jupiter = live.find((quote) => quote.venue === "jupiter") ?? null;
    if (!params.cheapest) {
      return raydiumMiss?.reason || "No executable route from Raydium, Jupiter, or Meteora for this size.";
    }
    const winnerName = this.venueTitle(params.cheapest.venue);
    if (live.length === 1) {
      const miss = raydiumMiss ? " Raydium has no pool." : "";
      return `${winnerName} quoted this size.${miss} PegLens did not get a second venue to compare — not a cheapest claim.`;
    }
    if (params.raydium && params.cheapest.venue === "raydium") {
      if (jupiter && this.jupiterIsRaydium(jupiter)) {
        return "Raydium is the cheapest venue. Jupiter’s quote is the same Raydium CLMM hop.";
      }
      return "Raydium is the cheapest executable venue at this size.";
    }
    if (params.raydium && params.cheapest.venue !== "raydium") {
      const extra = this.deltaBps(params.raydium, params.cheapest);
      return `${winnerName} is cheaper than Raydium by ${extra} bps. Raydium still has a live pool — PegLens will not hide that.`;
    }
    const hops = params.cheapest.hopLabels.join(" → ") || "direct";
    return `Raydium has no pool. ${winnerName} quoted via ${hops}. Indicative only — not a fill.`;
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
