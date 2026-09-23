import { describe, expect, it } from "vitest";
import { Format } from "@/lib/ui/Format";

describe("Format.gapPct", () => {
  it("shows a bps gap as a signed percent, with extra precision for tiny gaps", () => {
    expect(Format.gapPct(56.23)).toBe("+0.56%");
    expect(Format.gapPct(-12)).toBe("−0.12%");
    expect(Format.gapPct(-4.1)).toBe("−0.041%");
    expect(Format.gapPct(0.7)).toBe("0.007%");
    expect(Format.gapPct(0)).toBe("0.000%");
    expect(Format.gapPct(null)).toBe("—");
    expect(Format.gapPct(Number.NaN)).toBe("—");
  });
});

describe("Format.signedUsd", () => {
  it("signs dollar gaps with a real minus and keeps missing values empty", () => {
    expect(Format.signedUsd(4.35)).toBe("+$4.35");
    expect(Format.signedUsd(-0.1500000001)).toBe("−$0.15");
    expect(Format.signedUsd(1234.5)).toBe("+$1,234.50");
    expect(Format.signedUsd(0.004)).toBe("$0.00");
    expect(Format.signedUsd(-0.004)).toBe("$0.00");
    expect(Format.signedUsd(null)).toBe("—");
    expect(Format.signedUsd(Number.NaN)).toBe("—");
  });

  it("drops the sign when told the gap is flat, matching gapPct's unsigned in-line reading", () => {
    expect(Format.signedUsd(-0.03, { flat: true })).toBe("$0.03");
    expect(Format.signedUsd(0.03, { flat: true })).toBe("$0.03");
  });
});

describe("Format.pct", () => {
  it("signs percent-unit changes and keeps missing values empty", () => {
    expect(Format.pct(0.4)).toBe("+0.40%");
    expect(Format.pct(-0.0278)).toBe("−0.03%");
    expect(Format.pct(0.001)).toBe("0.00%");
    expect(Format.pct(null)).toBe("—");
    expect(Format.pct(Number.NaN)).toBe("—");
  });
});
