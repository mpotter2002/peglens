type Entry<T> = { value: T; expiresAt: number };

export class TtlCache {
  private static store = new Map<string, Entry<unknown>>();

  static get<T>(key: string): T | null {
    const hit = this.store.get(key);
    if (!hit) {
      return null;
    }
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return hit.value as T;
  }

  static set<T>(key: string, value: T, ttlMs: number): T {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  static async remember<T>(key: string, ttlMs: number, produce: () => Promise<T>): Promise<T> {
    const existing = this.get<T>(key);
    if (existing !== null) {
      return existing;
    }
    const value = await produce();
    return this.set(key, value, ttlMs);
  }
}
