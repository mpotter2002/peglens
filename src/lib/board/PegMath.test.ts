import { describe, expect, it } from "vitest";
import { PegMath } from "@/lib/board/PegMath";

describe("PegMath", () => {
  it("computes a wrapper premium in bps", () => {
    expect(PegMath.premiumBps(333.47, 332.54)).toBeCloseTo(27.97, 1);
    expect(PegMath.sign(27.97)).toBe("premium");
  });

  it("computes a discount and treats tiny gaps as flat", () => {
    expect(PegMath.premiumBps(332.5, 332.54)).toBeCloseTo(-1.2, 1);
    expect(PegMath.sign(-1.2)).toBe("flat");
    expect(PegMath.sign(-12)).toBe("discount");
  });

  it("refuses invented numbers", () => {
    expect(PegMath.premiumBps(Number.NaN, 100)).toBeNull();
    expect(PegMath.impliedUsdPerShare(100, 0)).toBeNull();
    expect(PegMath.atomicToDecimal("29966195", 8)).toBeCloseTo(0.29966195);
  });
});
