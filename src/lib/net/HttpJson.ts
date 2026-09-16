export class HttpJson {
  static async get(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; text: string }> {
    const response = await fetch(url, {
      ...init,
      headers: {
        accept: "application/json, text/plain, */*",
        "user-agent": "PegLens/0.1 (https://github.com/mpotter2002/peglens)",
        ...init?.headers,
      },
      cache: "no-store",
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  }

  static parse<T>(text: string): T | null {
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }
}
