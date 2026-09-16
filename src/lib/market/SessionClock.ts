import type { SessionName, SessionSnapshot } from "@/lib/types";

const NY = "America/New_York";

export class SessionClock {
  static snapshot(now = new Date(), pyth?: { isOpen: boolean; nextOpen: number | null; nextClose: number | null }): SessionSnapshot {
    const parts = this.nyParts(now);
    const weekday = parts.weekday;
    const minutes = parts.hour * 60 + parts.minute;
    const weekend = weekday === 0 || weekday === 6;
    const name = this.sessionName(weekend, minutes);
    const cashOpen = name === "regular";
    const pythEquityOpen = pyth ? pyth.isOpen : null;
    const afterHoursNarrative = !cashOpen;

    return {
      name,
      cashOpen,
      pythEquityOpen,
      nextOpen: pyth?.nextOpen ?? null,
      nextClose: pyth?.nextClose ?? null,
      label: this.label(name),
      detail: this.detail(name, pyth?.nextOpen ?? null),
      afterHoursNarrative,
    };
  }

  static sessionName(weekend: boolean, minutes: number): SessionName {
    if (weekend) {
      return "weekend";
    }
    if (minutes >= 9 * 60 + 30 && minutes < 16 * 60) {
      return "regular";
    }
    if (minutes >= 4 * 60 && minutes < 9 * 60 + 30) {
      return "pre-market";
    }
    if (minutes >= 16 * 60 && minutes < 20 * 60) {
      return "after-hours";
    }
    return "overnight";
  }

  static label(name: SessionName): string {
    switch (name) {
      case "regular":
        return "US cash open";
      case "pre-market":
        return "Pre-market";
      case "after-hours":
        return "After hours";
      case "overnight":
        return "Overnight";
      case "weekend":
        return "Weekend";
    }
  }

  static detail(name: SessionName, nextOpen: number | null): string {
    const openHint = nextOpen
      ? `Next cash open ${this.formatNy(nextOpen)}.`
      : "Next cash open follows the NYSE calendar.";
    if (name === "regular") {
      return "NYSE/Nasdaq regular session · 09:30–16:00 ET. Wrappers still trade around the cash print.";
    }
    return `US listed cash is shut. Tokenized names keep printing — ~63% of xStocks volume historically hits while NYSE is closed. ${openHint}`;
  }

  static nyParts(now: Date): { weekday: number; hour: number; minute: number } {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: NY,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const bag: Record<string, string> = {};
    for (const part of fmt.formatToParts(now)) {
      if (part.type !== "literal") {
        bag[part.type] = part.value;
      }
    }
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return {
      weekday: weekdayMap[bag.weekday] ?? 0,
      hour: Number(bag.hour),
      minute: Number(bag.minute),
    };
  }

  static formatNy(unixSeconds: number): string {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: NY,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(unixSeconds * 1000));
  }
}
