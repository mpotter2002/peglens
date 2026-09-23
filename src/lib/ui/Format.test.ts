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

describe("Format.pct", () => {
  it("signs percent-unit changes and keeps missing values empty", () => {
    expect(Format.pct(0.4)).toBe("+0.40%");
    expect(Format.pct(-0.0278)).toBe("−0.03%");
    expect(Format.pct(0.001)).toBe("0.00%");
    expect(Format.pct(null)).toBe("—");
    expect(Format.pct(Number.NaN)).toBe("—");
  });
});
