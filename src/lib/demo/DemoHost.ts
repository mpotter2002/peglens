import type { DemoEnv, DemoHostInfo } from "@/lib/types";

export class DemoHost {
  static env(): DemoEnv {
    const vercelEnv = process.env.VERCEL_ENV;
    if (vercelEnv === "production") {
      return "production";
    }
    if (vercelEnv === "preview" || vercelEnv === "development") {
      return "preview";
    }
    return "local";
  }

  static chip(env = this.env()): string {
    switch (env) {
      case "production":
        return "Hosted";
      case "preview":
        return "Vercel preview";
      default:
        return "Local / test";
    }
  }

  static snapshot(): DemoHostInfo {
    const env = this.env();
    return { env, label: this.chip(env) };
  }
}
