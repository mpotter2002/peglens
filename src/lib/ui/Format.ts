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

  static bps(value: number | null): string {
    if (value === null || !Number.isFinite(value)) {
      return "—";
    }
    const abs = Math.abs(value);
    const pretty = abs >= 10 ? abs.toFixed(0) : abs.toFixed(1);
    if (Math.abs(value) < 2) {
      return `${pretty} bps`;
    }
    return `${value > 0 ? "+" : "−"}${pretty} bps`;
  }

  /** `value` is already in percent units (Pyth Terminal's changePct24h: -0.03 means -0.03%). */
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
