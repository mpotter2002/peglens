import { describe, expect, it } from "vitest";
import { SessionClock } from "@/lib/market/SessionClock";

describe("SessionClock", () => {
  it("labels a Wednesday 18:44 ET as after hours", () => {
    const name = SessionClock.sessionName(false, 18 * 60 + 44);
    expect(name).toBe("after-hours");
    const snap = SessionClock.snapshot(new Date("2026-09-16T22:44:00Z"), {
      isOpen: false,
      nextOpen: 1789651800,
      nextClose: 1789675200,
    });
    expect(snap.cashOpen).toBe(false);
    expect(snap.afterHoursNarrative).toBe(true);
    expect(snap.pythEquityOpen).toBe(false);
    expect(snap.detail).toMatch(/63%/);
  });

  it("labels regular cash hours", () => {
    expect(SessionClock.sessionName(false, 10 * 60)).toBe("regular");
    expect(SessionClock.sessionName(true, 10 * 60)).toBe("weekend");
    expect(SessionClock.sessionName(false, 5 * 60)).toBe("pre-market");
    expect(SessionClock.sessionName(false, 22 * 60)).toBe("overnight");
  });
});
