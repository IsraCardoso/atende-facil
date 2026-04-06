/** Adapter de cache via Valkey (Redis-compatible). Serializa valores em JSON e respeita TTL configurado. */
import { createClient } from "redis";

import type { CacheEntry, CachePort } from "../../domain/ports";

type ValkeyCacheClient = Readonly<{
  isOpen: boolean;
  connect: () => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options: Readonly<{ EX: number }>) => Promise<unknown>;
  del: (key: string) => Promise<number>;
}>;

type CreateValkeyCacheAdapterInput = Readonly<{
  client: ValkeyCacheClient;
  namespace?: string;
}>;

type ValkeyCacheAdapterFactoryInput = Readonly<{
  valkeyUrl: string;
  namespace?: string;
}>;

function createNamespacedKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
}

function serializeCacheEntryValue(value: unknown): string {
  return JSON.stringify(value);
}

function deserializeCacheEntryValue<TValue>(rawValue: string): TValue | null {
  try {
    return JSON.parse(rawValue) as TValue;
  } catch {
    return null;
  }
}

export function createValkeyCacheClient(valkeyUrl: string): ValkeyCacheClient {
  return createClient({
    url: valkeyUrl,
  });
}

export function createValkeyCacheAdapter(input: CreateValkeyCacheAdapterInput): CachePort {
  const namespace = input.namespace ?? "api-cache";
  let connectionPromise: Promise<void> | null = null;

  async function ensureConnected(): Promise<void> {
    if (input.client.isOpen) {
      return;
    }

    if (!connectionPromise) {
      connectionPromise = input.client.connect().then(() => undefined);
    }

    await connectionPromise;
  }

  return {
    async get<TValue>(key: string): Promise<TValue | null> {
      await ensureConnected();

      const rawValue = await input.client.get(createNamespacedKey(namespace, key));

      if (!rawValue) {
        return null;
      }

      return deserializeCacheEntryValue<TValue>(rawValue);
    },
    async set(entry: CacheEntry): Promise<void> {
      await ensureConnected();

      await input.client.set(
        createNamespacedKey(namespace, entry.key),
        serializeCacheEntryValue(entry.value),
        {
          EX: entry.ttlSeconds,
        },
      );
    },
    async delete(key: string): Promise<void> {
      await ensureConnected();
      await input.client.del(createNamespacedKey(namespace, key));
    },
  };
}

export function createValkeyCacheAdapterFromUrl(input: ValkeyCacheAdapterFactoryInput): CachePort {
  return createValkeyCacheAdapter({
    client: createValkeyCacheClient(input.valkeyUrl),
    ...(input.namespace ? { namespace: input.namespace } : {}),
  });
}

export type { CreateValkeyCacheAdapterInput, ValkeyCacheAdapterFactoryInput, ValkeyCacheClient };
