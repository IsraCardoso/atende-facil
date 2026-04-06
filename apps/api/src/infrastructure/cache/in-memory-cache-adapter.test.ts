import { describe, expect, it, vi } from "vitest";

import { createInMemoryCacheAdapter } from "./in-memory-cache-adapter";

describe("createInMemoryCacheAdapter", () => {
  it("should store and read cached values", async () => {
    const cache = createInMemoryCacheAdapter();

    await cache.set({
      key: "user:1",
      value: {
        id: "user-1",
      },
      ttlSeconds: 10,
    });

    const cachedValue = await cache.get<{ id: string }>("user:1");

    expect(cachedValue).toEqual({
      id: "user-1",
    });
  });

  it("should expire entries after ttl", async () => {
    vi.useFakeTimers();
    const cache = createInMemoryCacheAdapter();

    await cache.set({
      key: "user:expired",
      value: "value",
      ttlSeconds: 1,
    });

    vi.advanceTimersByTime(1100);

    const cachedValue = await cache.get("user:expired");

    expect(cachedValue).toBeNull();
    vi.useRealTimers();
  });
});
