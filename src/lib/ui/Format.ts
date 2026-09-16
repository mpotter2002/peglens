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
}
