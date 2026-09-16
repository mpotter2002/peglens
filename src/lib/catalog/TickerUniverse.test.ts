import { describe, expect, it } from "vitest";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";

describe("TickerUniverse", () => {
  it("defaults junk input to AAPL", () => {
    expect(TickerUniverse.normalize("")).toBe("AAPL");
    expect(TickerUniverse.normalize("../etc")).toBe("AAPL");
    expect(TickerUniverse.normalize("tsla")).toBe("TSLA");
  });
});
