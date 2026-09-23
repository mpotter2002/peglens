import { describe, expect, it } from "vitest";
import { Format } from "@/lib/ui/Format";

describe("Format.pct", () => {
  it("signs percent-unit changes and keeps missing values empty", () => {
    expect(Format.pct(0.4)).toBe("+0.40%");
    expect(Format.pct(-0.0278)).toBe("−0.03%");
    expect(Format.pct(0.001)).toBe("0.00%");
    expect(Format.pct(null)).toBe("—");
    expect(Format.pct(Number.NaN)).toBe("—");
  });
});
