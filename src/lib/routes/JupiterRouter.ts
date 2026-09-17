import { HttpJson } from "@/lib/net/HttpJson";
import { PegMath } from "@/lib/board/PegMath";
import { MintResolver } from "@/lib/wrappers/MintResolver";
import type { SwapQuote } from "@/lib/types";

type JupiterQuote = {
  outAmount?: string;
  priceImpactPct?: string;
  routePlan?: Array<{ swapInfo?: { label?: string; ammKey?: string }; percent?: number }>;
  error?: string;
};

export class JupiterRouter {
  static swapUrl(outputMint: string): string {
    return `https://jup.ag/swap/USDC-${outputMint}`;
  }

  static async quote(params: {
    outputMint: string;
    outDecimals: number;
    inAtomic: string;
  }): Promise<SwapQuote> {
    const inputMint = MintResolver.USDC;
    const url =
      `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}` +
      `&outputMint=${params.outputMint}&amount=${params.inAtomic}&slippageBps=50`;
    const { ok, status, text } = await HttpJson.get(url);
    const body = HttpJson.parse<JupiterQuote>(text);
    const hops = (body?.routePlan ?? [])
      .map((hop) => hop.swapInfo?.label)
      .filter((label): label is string => Boolean(label));
    if (!ok || !body?.outAmount) {
      return {
        venue: "jupiter",
        available: false,
        reason: status === 0 ? "Jupiter quote timed out" : body?.error || "Jupiter quote unavailable",
        inMint: inputMint,
        outMint: params.outputMint,
        inAmountAtomic: params.inAtomic,
        outAmountAtomic: null,
        inDecimals: MintResolver.USDC_DECIMALS,
        outDecimals: params.outDecimals,
        inUsd: PegMath.atomicToDecimal(params.inAtomic, MintResolver.USDC_DECIMALS) ?? 0,
        outShares: null,
        effectiveUsdPerShare: null,
        priceImpactPct: null,
        hopLabels: [],
        poolId: null,
        url: this.swapUrl(params.outputMint),
      };
    }
    const outShares = PegMath.atomicToDecimal(body.outAmount, params.outDecimals);
    const inUsd = PegMath.atomicToDecimal(params.inAtomic, MintResolver.USDC_DECIMALS) ?? 0;
    const impact = body.priceImpactPct ? Number(body.priceImpactPct) : null;
    return {
      venue: "jupiter",
      available: true,
      reason: null,
      inMint: inputMint,
      outMint: params.outputMint,
      inAmountAtomic: params.inAtomic,
      outAmountAtomic: body.outAmount,
      inDecimals: MintResolver.USDC_DECIMALS,
      outDecimals: params.outDecimals,
      inUsd,
      outShares,
      effectiveUsdPerShare: outShares ? PegMath.impliedUsdPerShare(inUsd, outShares) : null,
      priceImpactPct: Number.isFinite(impact) ? impact : null,
      hopLabels: hops,
      poolId: body.routePlan?.[0]?.swapInfo?.ammKey ?? null,
      url: this.swapUrl(params.outputMint),
    };
  }
}
