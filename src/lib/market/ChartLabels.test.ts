import { describe, expect, it } from "vitest";
import { ChartLabels } from "@/lib/market/ChartLabels";

/** 2026-09-24 13:30:00Z = 9:30 AM EDT (the NYSE open). */
const OPEN = Date.UTC(2026, 8, 24, 13, 30) / 1000;

describe("ChartLabels.time", () => {
  it("prints intraday times in New York time, not the viewer's timezone", () => {
    expect(ChartLabels.time(OPEN, "1D")).toBe("9:30 AM");
    expect(ChartLabels.time(OPEN + 6.5 * 3600, "1D")).toBe("4:00 PM");
  });

  it("prints 1W points as weekday + New York hour", () => {
    expect(ChartLabels.time(OPEN, "1W")).toBe("Thu 9:30 AM");
  });

  it("prints 1M/3M as month + day", () => {
    expect(ChartLabels.time(OPEN, "1M")).toBe("Sep 24");
    expect(ChartLabels.time(OPEN, "3M")).toBe("Sep 24");
  });

  it("prints 1Y with an apostrophe year so it cannot be misread as a day of the month", () => {
    expect(ChartLabels.time(OPEN, "1Y")).toBe("Sep '26");
  });
});

describe("ChartLabels.caption", () => {
  it("names the real bar size for each range", () => {
    expect(ChartLabels.caption("1D")).toBe("5-min closes · ET");
    expect(ChartLabels.caption("1W")).toBe("15-min closes · ET");
    expect(ChartLabels.caption("1M")).toBe("daily closes");
    expect(ChartLabels.caption("3M")).toBe("daily closes");
    expect(ChartLabels.caption("1Y")).toBe("weekly closes");
  });
});

describe("ChartLabels.window", () => {
  it("reads 1D as today and every other range as a trailing window", () => {
    expect(ChartLabels.window("1D")).toBe("today");
    expect(ChartLabels.window("1W")).toBe("past week");
    expect(ChartLabels.window("1M")).toBe("past month");
    expect(ChartLabels.window("3M")).toBe("past 3 months");
    expect(ChartLabels.window("1Y")).toBe("past year");
  });
});

describe("ChartLabels.indexAt", () => {
  it("maps a pointer position across the plot to the nearest point, clamped to the ends", () => {
    expect(ChartLabels.indexAt(0, 100, 11)).toBe(0);
    expect(ChartLabels.indexAt(50, 100, 11)).toBe(5);
    expect(ChartLabels.indexAt(100, 100, 11)).toBe(10);
    expect(ChartLabels.indexAt(-20, 100, 11)).toBe(0);
    expect(ChartLabels.indexAt(140, 100, 11)).toBe(10);
  });

  it("returns null when there is nothing to point at", () => {
    expect(ChartLabels.indexAt(10, 100, 0)).toBeNull();
    expect(ChartLabels.indexAt(10, 0, 5)).toBeNull();
  });
});
