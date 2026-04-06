import type { CacheEntry, CachePort } from "../../domain/ports";

type InMemoryCacheItem = Readonly<{
  value: unknown;
  expiresAtEpochMs: number;
}>;

export function createInMemoryCacheAdapter(): CachePort {
  const cache = new Map<string, InMemoryCacheItem>();

  return {
    async get<TValue>(key: string): Promise<TValue | null> {
      const entry = cache.get(key);

      if (!entry) {
        return null;
      }

      if (Date.now() >= entry.expiresAtEpochMs) {
        cache.delete(key);
        return null;
      }

      return entry.value as TValue;
    },
    async set(entry: CacheEntry): Promise<void> {
      const expiresAtEpochMs = Date.now() + entry.ttlSeconds * 1000;

      cache.set(entry.key, {
        value: entry.value,
        expiresAtEpochMs,
      });
    },
    async delete(key: string): Promise<void> {
      cache.delete(key);
    },
  };
}
