export class Format {
  static usd(value: number | null, digits = 2): string {
    if (value === null || !Number.isFinite(value)) {
      return "—";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  static compactUsd(value: number | null): string {
    if (value === null || !Number.isFinite(value)) {
      return "—";
    }
    return this.usd(value, value >= 100 ? 2 : 4);
  }

  /** `value` is already in percent units (Pyth Terminal's changePct24h: -0.03 means -0.03%). */
  /**
   * A peg gap given in bps, shown as a percent (1 bps = 0.01%). Gaps under 0.1% get a third
   * decimal so "in line" never rounds to a misleading 0.00%.
   */
  static gapPct(bps: number | null): string {
    if (bps === null || !Number.isFinite(bps)) {
      return "—";
    }
    const pct = bps / 100;
    const abs = Math.abs(pct);
    const pretty = abs < 0.1 ? abs.toFixed(3) : abs.toFixed(2);
    if (Math.abs(bps) < 2) {
      return `${pretty}%`;
    }
    return `${pct > 0 ? "+" : "−"}${pretty}%`;
  }

  static pct(value: number | null): string {
    if (value === null || !Number.isFinite(value)) {
      return "—";
    }
    const abs = Math.abs(value).toFixed(2);
    if (abs === "0.00") {
      return "0.00%";
    }
    return `${value > 0 ? "+" : "−"}${abs}%`;
  }

  static relative(unixSeconds: number | null): string {
    if (!unixSeconds) {
      return "snapshot";
    }
    const delta = Date.now() / 1000 - unixSeconds;
    if (delta < 5) {
      return "just now";
    }
    if (delta < 90) {
      return `${Math.round(delta)}s ago`;
    }
    if (delta < 3600) {
      return `${Math.round(delta / 60)}m ago`;
    }
    return `${Math.round(delta / 3600)}h ago`;
  }

  static clock(ms: number): string {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    }).format(new Date(ms));
  }

  static mint(value: string | null): string {
    if (!value) {
      return "—";
    }
    return `${value.slice(0, 4)}…${value.slice(-4)}`;
  }

  static feedId(value: string | null): string {
    if (!value) {
      return "—";
    }
    const clean = value.replace(/^0x/i, "");
    if (clean.length <= 12) {
      return `0x${clean}`;
    }
    return `0x${clean.slice(0, 8)}…${clean.slice(-4)}`;
  }

  static confidence(value: number | null): string | null {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }
    return `±${this.usd(value, value >= 1 ? 2 : 4)} conf`;
  }

  static publishClock(unixSeconds: number | null): string | null {
    if (!unixSeconds || !Number.isFinite(unixSeconds)) {
      return null;
    }
    return this.clock(unixSeconds * 1000);
  }
}
