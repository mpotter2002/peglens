export type HttpJsonResult = {
  ok: boolean;
  status: number;
  text: string;
};

export class HttpJson {
  static readonly DEFAULT_TIMEOUT_MS = 2_500;

  static async get(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<HttpJsonResult> {
    const timeoutMs = init.timeoutMs ?? this.DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers = new Headers(init.headers);
    if (!headers.has("accept")) {
      headers.set("accept", "application/json, text/plain, */*");
    }
    if (!headers.has("user-agent")) {
      headers.set("user-agent", "xStockLens/0.1 (https://github.com/mpotter2002/xstocklens)");
    }
    try {
      const response = await fetch(url, {
        method: init.method,
        body: init.body,
        headers,
        signal: controller.signal,
        cache: init.cache ?? "no-store",
      });
      const text = await response.text();
      return { ok: response.ok, status: response.status, text };
    } catch {
      return { ok: false, status: 0, text: "" };
    } finally {
      clearTimeout(timer);
    }
  }

  static parse<T>(text: string): T | null {
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }
}
