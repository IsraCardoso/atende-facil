import { describe, expect, it } from "vitest";

import { createValkeyCacheAdapter, type ValkeyCacheClient } from "./valkey-cache-adapter";

type FakeValkeyClient = ValkeyCacheClient &
  Readonly<{
    storage: Map<string, string>;
    connectionCount: () => number;
  }>;

function createFakeValkeyClient(): FakeValkeyClient {
  let isOpen = false;
  let connectCount = 0;
  const storage = new Map<string, string>();

  return {
    get isOpen() {
      return isOpen;
    },
    async connect() {
      connectCount += 1;
      isOpen = true;
    },
    async get(key: string) {
      return storage.get(key) ?? null;
    },
    async set(key: string, value: string, _options: Readonly<{ EX: number }>) {
      storage.set(key, value);
    },
    async del(key: string) {
      const removed = storage.delete(key);
      return removed ? 1 : 0;
    },
    storage,
    connectionCount() {
      return connectCount;
    },
  };
}

describe("createValkeyCacheAdapter", () => {
  it("should connect once and use namespaced keys", async () => {
    const client = createFakeValkeyClient();
    const cache = createValkeyCacheAdapter({
      client,
      namespace: "unit",
    });

    await cache.set({
      key: "user:1",
      value: {
        id: "user-1",
      },
      ttlSeconds: 30,
    });
    const value = await cache.get<{ id: string }>("user:1");

    expect(client.connectionCount()).toBe(1);
    expect(client.storage.has("unit:user:1")).toBe(true);
    expect(value).toEqual({
      id: "user-1",
    });
  });

  it("should return null when cache payload is not valid json", async () => {
    const client = createFakeValkeyClient();
    const cache = createValkeyCacheAdapter({
      client,
      namespace: "unit",
    });

    await client.connect();
    client.storage.set("unit:broken", "{");

    const value = await cache.get("broken");

    expect(value).toBeNull();
  });
});
