import { HttpJson } from "@/lib/net/HttpJson";
import { TtlCache } from "@/lib/cache/TtlCache";

export type SolanaMint = {
  mint: string;
  decimals: number;
  symbol: string;
  name: string;
};

type XStockAsset = {
  name?: string;
  symbol?: string;
  deployments?: Array<{
    network?: string;
    address?: string;
  }>;
};

type JupiterHit = {
  id?: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  tags?: string[];
  isVerified?: boolean;
};

export class MintResolver {
  static readonly USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  static readonly USDC_DECIMALS = 6;

  static async xstock(ticker: string): Promise<SolanaMint | null> {
    const symbol = `${ticker.toUpperCase()}x`;
    return TtlCache.remember(`mint:xstock:${symbol}`, 30 * 60_000, async () => {
      const url = `https://api.xstocks.fi/api/v2/public/assets/${encodeURIComponent(symbol)}`;
      const { ok, text } = await HttpJson.get(url);
      if (!ok) {
        return null;
      }
      const asset = HttpJson.parse<XStockAsset>(text);
      const solana = asset?.deployments?.find((row) => row.network === "Solana" && row.address);
      if (!solana?.address) {
        return null;
      }
      return {
        mint: solana.address,
        decimals: 8,
        symbol,
        name: asset?.name ?? `${ticker} xStock`,
      };
    });
  }

  static async ondo(ticker: string): Promise<SolanaMint | null> {
    const symbol = `${ticker.toUpperCase()}on`;
    return TtlCache.remember(`mint:ondo:${symbol}`, 30 * 60_000, async () => {
      const url = `https://lite-api.jup.ag/tokens/v2/search?query=${encodeURIComponent(symbol)}`;
      const { ok, text } = await HttpJson.get(url);
      if (!ok) {
        return null;
      }
      const hits = HttpJson.parse<JupiterHit[]>(text);
      if (!Array.isArray(hits)) {
        return null;
      }
      const match =
        hits.find((hit) => hit.symbol === symbol && hit.tags?.includes("ondo")) ??
        hits.find((hit) => hit.symbol === symbol && hit.isVerified);
      if (!match?.id || typeof match.decimals !== "number") {
        return null;
      }
      return {
        mint: match.id,
        decimals: match.decimals,
        symbol,
        name: match.name ?? `${ticker} (Ondo Tokenized)`,
      };
    });
  }
}
