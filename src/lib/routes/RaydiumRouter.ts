import { HttpJson } from "@/lib/net/HttpJson";
import { PegMath } from "@/lib/board/PegMath";
import { MintResolver } from "@/lib/wrappers/MintResolver";
import type { SwapQuote } from "@/lib/types";

type RaydiumCompute = {
  success?: boolean;
  msg?: string;
  data?: {
    outputAmount?: string;
    priceImpactPct?: number;
    routePlan?: Array<{ poolId?: string }>;
  };
};

export class RaydiumRouter {
  static swapUrl(outputMint: string): string {
    return `https://raydium.io/swap/?inputMint=usdc&outputMint=${outputMint}`;
  }

  static async quote(params: {
    outputMint: string;
    outDecimals: number;
    inAtomic: string;
  }): Promise<SwapQuote> {
    const inputMint = MintResolver.USDC;
    const url =
      `https://transaction-v1.raydium.io/compute/swap-base-in` +
      `?inputMint=${inputMint}&outputMint=${params.outputMint}` +
      `&amount=${params.inAtomic}&slippageBps=50&txVersion=V0`;
    const { ok, status, text } = await HttpJson.get(url);
    const body = HttpJson.parse<RaydiumCompute>(text);
    if (!ok || !body?.success || !body.data?.outputAmount) {
      return {
        venue: "raydium",
        available: false,
        reason:
          status === 0
            ? "Raydium quote timed out"
            : body?.msg === "ROUTE_NOT_FOUND"
              ? "Raydium has no route for this mint"
              : "Raydium quote unavailable",
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
    const outShares = PegMath.atomicToDecimal(body.data.outputAmount, params.outDecimals);
    const inUsd = PegMath.atomicToDecimal(params.inAtomic, MintResolver.USDC_DECIMALS) ?? 0;
    return {
      venue: "raydium",
      available: true,
      reason: null,
      inMint: inputMint,
      outMint: params.outputMint,
      inAmountAtomic: params.inAtomic,
      outAmountAtomic: body.data.outputAmount,
      inDecimals: MintResolver.USDC_DECIMALS,
      outDecimals: params.outDecimals,
      inUsd,
      outShares,
      effectiveUsdPerShare: outShares ? PegMath.impliedUsdPerShare(inUsd, outShares) : null,
      priceImpactPct: typeof body.data.priceImpactPct === "number" ? body.data.priceImpactPct : null,
      hopLabels: ["Raydium"],
      poolId: body.data.routePlan?.[0]?.poolId ?? null,
      url: this.swapUrl(params.outputMint),
    };
  }
}
