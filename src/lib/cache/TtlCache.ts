type Entry<T> = { value: T; expiresAt: number };

export class TtlCache {
  private static store = new Map<string, Entry<unknown>>();

  static get<T>(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) {
      return undefined;
    }
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value as T;
  }

  static set<T>(key: string, value: T, ttlMs: number): T {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  static async remember<T>(
    key: string,
    ttlMs: number,
    produce: () => Promise<T>,
    options?: { skipCache?: (value: T) => boolean },
  ): Promise<T> {
    const existing = this.get<T>(key);
    if (existing !== undefined) {
      return existing;
    }
    const value = await produce();
    if (options?.skipCache?.(value)) {
      return value;
    }
    return this.set(key, value, ttlMs);
  }

  static clear(): void {
    this.store.clear();
  }
}
