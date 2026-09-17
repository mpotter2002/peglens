import { describe, expect, it } from "vitest";
import { BoardComposer } from "@/lib/board/BoardComposer";

describe("BoardComposer.unavailable", () => {
  it("returns honest empty cells instead of invented marks or fills", () => {
    const board = BoardComposer.unavailable("AAPL", "Venues unreachable.");
    expect(board.ticker).toBe("AAPL");
    expect(board.equity.priceUsd).toBeNull();
    expect(board.wrappers.every((wrapper) => wrapper.priceUsd === null)).toBe(true);
    expect(board.cheapestHonest).toBeNull();
    expect(board.routes.every((route) => route.featured === null)).toBe(true);
    expect(board.warnings[0]).toMatch(/Venues unreachable/);
    expect(BoardComposer.isEmpty(board)).toBe(true);
  });
});
