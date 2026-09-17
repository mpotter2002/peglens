import { afterEach, describe, expect, it } from "vitest";
import { DemoHost } from "@/lib/demo/DemoHost";

describe("DemoHost", () => {
  const previous = {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };

  afterEach(() => {
    restore("VERCEL", previous.VERCEL);
    restore("VERCEL_ENV", previous.VERCEL_ENV);
  });

  it("labels a laptop run as Local / test", () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    expect(DemoHost.env()).toBe("local");
    expect(DemoHost.chip()).toBe("Local / test");
  });

  it("labels a Vercel preview without calling it local", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    expect(DemoHost.snapshot()).toEqual({ env: "preview", label: "Vercel preview" });
  });
});

function restore(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
