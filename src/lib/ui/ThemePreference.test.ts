import { describe, expect, it } from "vitest";
import { ThemePreference } from "@/lib/ui/ThemePreference";

describe("ThemePreference", () => {
  it("parses known choices and falls back to light", () => {
    expect(ThemePreference.parse("light")).toBe("light");
    expect(ThemePreference.parse("system")).toBe("system");
    expect(ThemePreference.parse("dark")).toBe("dark");
    expect(ThemePreference.parse("nope")).toBe("light");
    expect(ThemePreference.parse(null)).toBe("light");
    expect(ThemePreference.DEFAULT).toBe("light");
  });

  it("cycles System → Light → Dark → System", () => {
    expect(ThemePreference.cycle("system")).toBe("light");
    expect(ThemePreference.cycle("light")).toBe("dark");
    expect(ThemePreference.cycle("dark")).toBe("system");
  });

  it("resolves system from prefers-color-scheme", () => {
    expect(ThemePreference.resolved("system", true)).toBe("dark");
    expect(ThemePreference.resolved("system", false)).toBe("light");
    expect(ThemePreference.resolved("light", true)).toBe("light");
    expect(ThemePreference.resolved("dark", false)).toBe("dark");
  });

  it("applies the dark class and color-scheme", () => {
    const root = {
      classList: { dark: false, toggle(token: string, force?: boolean) {
        if (token === "dark") {
          this.dark = Boolean(force);
        }
      } },
      style: { colorScheme: "" },
    };
    ThemePreference.apply("dark", root);
    expect(root.classList.dark).toBe(true);
    expect(root.style.colorScheme).toBe("dark");
    ThemePreference.apply("light", root);
    expect(root.classList.dark).toBe(false);
    expect(root.style.colorScheme).toBe("light");
  });

  it("embeds the peglens storage key in the blocking script", () => {
    expect(ThemePreference.blockingScript()).toContain("peglens.theme");
    expect(ThemePreference.blockingScript()).toContain('"light"');
  });
});
