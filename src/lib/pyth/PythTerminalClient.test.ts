import { describe, expect, it } from "vitest";
import { PythTerminalClient } from "@/lib/pyth/PythTerminalClient";

describe("PythTerminalClient", () => {
  it("parses a Terminal HTML snapshot without inventing ticks", () => {
    const html = `AAPL (US.AAPL/USD) is trading at 332.54, +0.23% over the last 24 hours.
      {"changePct24h":0.226,"exponent":-5,"latestPrice":332.54,"live":true,"symbol":"Equity.US.AAPL/USD"}`;
    const quote = PythTerminalClient.parse("Equity.US.AAPL/USD", html);
    expect(quote?.priceUsd).toBe(332.54);
    expect(quote?.changePct24h).toBeCloseTo(0.226);
  });

  it("returns null when the page has no price", () => {
    expect(PythTerminalClient.parse("Equity.US.AAPL/USD", "<html>nope</html>")).toBeNull();
  });
});
