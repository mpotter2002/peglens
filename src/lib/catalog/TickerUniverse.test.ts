import { describe, expect, it } from "vitest";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";

describe("TickerUniverse", () => {
  it("defaults junk input to AAPL", () => {
    expect(TickerUniverse.normalize("")).toBe("AAPL");
    expect(TickerUniverse.normalize("../etc")).toBe("AAPL");
    expect(TickerUniverse.normalize("tsla")).toBe("TSLA");
  });

  it("treats a missing search param as home, not a desk ticker", () => {
    expect(TickerUniverse.fromSearchParam(undefined)).toBeNull();
    expect(TickerUniverse.fromSearchParam("")).toBeNull();
    expect(TickerUniverse.fromSearchParam("   ")).toBeNull();
    expect(TickerUniverse.fromSearchParam("tsla")).toBe("TSLA");
    expect(TickerUniverse.fromSearchParam("???")).toBe("AAPL");
  });

  it("only catalogs names for the demo universe, not unknown tickers", () => {
    expect(TickerUniverse.catalogName("AAPL")).toBe("Apple");
    expect(TickerUniverse.catalogName("ZZZZ")).toBeNull();
    expect(TickerUniverse.list()).toContain("AAPL");
  });
});
