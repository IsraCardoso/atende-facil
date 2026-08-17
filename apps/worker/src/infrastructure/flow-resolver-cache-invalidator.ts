/** Invalida cache do FlowResolver no Valkey (mesma chave/namespace da API). */
import { createClient } from "redis";

const FLOW_RESOLVER_CACHE_NAMESPACE = "api:flow-resolver";
const FLOW_RESOLVER_CACHE_KEY_PREFIX = "flow-resolver";

type FlowResolverCacheInvalidator = Readonly<{
  invalidateFlowResolver: (tenantId: string) => Promise<void>;
}>;

function buildNamespacedKey(tenantId: string): string {
  return `${FLOW_RESOLVER_CACHE_NAMESPACE}:${FLOW_RESOLVER_CACHE_KEY_PREFIX}:${tenantId}`;
}

export function createFlowResolverCacheInvalidator(redisUrl: string): FlowResolverCacheInvalidator {
  const client = createClient({ url: redisUrl });
  let connectPromise: Promise<void> | null = null;

  async function ensureConnected(): Promise<void> {
    if (client.isOpen) {
      return;
    }

    if (!connectPromise) {
      connectPromise = client.connect().then(() => undefined);
    }

    await connectPromise;
  }

  return {
    async invalidateFlowResolver(tenantId: string): Promise<void> {
      await ensureConnected();
      await client.del(buildNamespacedKey(tenantId));
    },
  };
}

export type { FlowResolverCacheInvalidator };
