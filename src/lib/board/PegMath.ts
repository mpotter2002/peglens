export class PegMath {
  static readonly FLAT_BPS = 2;

  static premiumBps(wrapperUsd: number, equityUsd: number): number | null {
    if (!Number.isFinite(wrapperUsd) || !Number.isFinite(equityUsd) || equityUsd === 0) {
      return null;
    }
    return ((wrapperUsd - equityUsd) / equityUsd) * 10_000;
  }

  static dollars(wrapperUsd: number, equityUsd: number): number | null {
    if (!Number.isFinite(wrapperUsd) || !Number.isFinite(equityUsd)) {
      return null;
    }
    return wrapperUsd - equityUsd;
  }

  static sign(bps: number | null): "premium" | "discount" | "flat" | "unavailable" {
    if (bps === null || !Number.isFinite(bps)) {
      return "unavailable";
    }
    if (Math.abs(bps) < this.FLAT_BPS) {
      return "flat";
    }
    return bps > 0 ? "premium" : "discount";
  }

  static impliedUsdPerShare(inUsd: number, outShares: number): number | null {
    if (!Number.isFinite(inUsd) || !Number.isFinite(outShares) || outShares <= 0) {
      return null;
    }
    return inUsd / outShares;
  }

  static atomicToDecimal(atomic: string, decimals: number): number | null {
    if (!/^\d+$/.test(atomic) || decimals < 0 || decimals > 18) {
      return null;
    }
    const padded = atomic.padStart(decimals + 1, "0");
    const whole = padded.slice(0, padded.length - decimals) || "0";
    const frac = decimals === 0 ? "" : padded.slice(padded.length - decimals);
    const asNumber = Number(decimals === 0 ? whole : `${whole}.${frac}`);
    return Number.isFinite(asNumber) ? asNumber : null;
  }
}
