import { afterEach, describe, expect, it } from "vitest";
import { TtlCache } from "@/lib/cache/TtlCache";

describe("TtlCache", () => {
  afterEach(() => {
    TtlCache.clear();
  });

  it("returns a cached hit within TTL", async () => {
    let calls = 0;
    const first = await TtlCache.remember("k", 10_000, async () => {
      calls += 1;
      return "live";
    });
    const second = await TtlCache.remember("k", 10_000, async () => {
      calls += 1;
      return "stale";
    });
    expect(first).toBe("live");
    expect(second).toBe("live");
    expect(calls).toBe(1);
  });

  it("does not cache values that skipCache rejects", async () => {
    let calls = 0;
    await TtlCache.remember("empty", 10_000, async () => {
      calls += 1;
      return [];
    }, { skipCache: (value) => value.length === 0 });
    await TtlCache.remember("empty", 10_000, async () => {
      calls += 1;
      return ["ok"];
    }, { skipCache: (value) => value.length === 0 });
    expect(calls).toBe(2);
  });
});
