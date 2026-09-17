import { describe, expect, it } from "vitest";
import { HttpJson } from "@/lib/net/HttpJson";

describe("HttpJson", () => {
  it("returns a failed result instead of throwing when the socket never accepts", async () => {
    const result = await HttpJson.get("http://127.0.0.1:1/", { timeoutMs: 80 });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.text).toBe("");
  });

  it("refuses to parse empty or non-JSON bodies", () => {
    expect(HttpJson.parse("")).toBeNull();
    expect(HttpJson.parse("<html>nope</html>")).toBeNull();
  });
});
