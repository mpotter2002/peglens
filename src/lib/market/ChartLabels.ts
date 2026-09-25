import type { ChartRange } from "@/lib/market/IntradayChart";

/** US cash equities trade on New York time; label bars there so a viewer in any timezone reads 9:30 AM as the open. */
const MARKET_TZ = "America/New_York";

const TIME = new Intl.DateTimeFormat("en-US", { timeZone: MARKET_TZ, hour: "numeric", minute: "2-digit" });
const WEEKDAY = new Intl.DateTimeFormat("en-US", { timeZone: MARKET_TZ, weekday: "short" });
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { timeZone: MARKET_TZ, month: "short", day: "numeric" });
const MONTH = new Intl.DateTimeFormat("en-US", { timeZone: MARKET_TZ, month: "short" });
const YEAR = new Intl.DateTimeFormat("en-US", { timeZone: MARKET_TZ, year: "2-digit" });

const CAPTIONS: Record<ChartRange, string> = {
  "1D": "5-min closes · ET",
  "1W": "15-min closes · ET",
  "1M": "daily closes",
  "3M": "daily closes",
  "1Y": "weekly closes",
};

const WINDOWS: Record<ChartRange, string> = {
  "1D": "today",
  "1W": "past week",
  "1M": "past month",
  "3M": "past 3 months",
  "1Y": "past year",
};

/** Text for the price chart: axis/hover labels, the bar-size caption, and the change window. */
export class ChartLabels {
  static time(epochSeconds: number, range: ChartRange): string {
    const date = new Date(epochSeconds * 1000);
    switch (range) {
      case "1D":
        return TIME.format(date);
      case "1W":
        return `${WEEKDAY.format(date)} ${TIME.format(date)}`;
      case "1Y":
        return `${MONTH.format(date)} '${YEAR.format(date)}`;
      default:
        return MONTH_DAY.format(date);
    }
  }

  static caption(range: ChartRange): string {
    return CAPTIONS[range];
  }

  static window(range: ChartRange): string {
    return WINDOWS[range];
  }

  /** Nearest point index for a pointer `offset` px into a plot `width` px wide, or null with nothing to hit. */
  static indexAt(offset: number, width: number, count: number): number | null {
    if (count <= 0 || width <= 0) return null;
    const ratio = Math.min(Math.max(offset / width, 0), 1);
    return Math.round(ratio * (count - 1));
  }
}
