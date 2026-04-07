/** Decorator que adiciona cache Valkey sobre FlowRepositoryPort. Apenas findActiveByTenant usa cache (RN-024). */

import type { FlowEntity, FlowId, FlowStatus } from "../../domain/flow-types";
import type { CachePort } from "../../domain/ports/auth-ports";
import type { PaginatedResult } from "../../domain/ports/conversation-ports";
import type { FlowFilters, FlowRepositoryPort } from "../../domain/ports/flow-ports";

type CachedFlowRepositoryConfig = Readonly<{
  ttlSeconds: number;
}>;

const DEFAULT_TTL_SECONDS = 300;

function cacheKey(tenantId: string): string {
  return `flow:active:${tenantId}`;
}

/** Envolve FlowRepositoryPort com cache para findActiveByTenant. Demais métodos delegam direto. */
export function createCachedFlowRepository(
  inner: FlowRepositoryPort,
  cache: CachePort,
  config?: CachedFlowRepositoryConfig,
): FlowRepositoryPort {
  const ttl = config?.ttlSeconds ?? DEFAULT_TTL_SECONDS;

  return {
    async findById(tenantId: string, flowId: FlowId): Promise<FlowEntity | null> {
      return inner.findById(tenantId, flowId);
    },

    async findActiveByTenant(tenantId: string): Promise<FlowEntity | null> {
      const cached = await cache.get<FlowEntity>(cacheKey(tenantId));
      if (cached) {
        return cached;
      }

      const flow = await inner.findActiveByTenant(tenantId);
      if (flow) {
        await cache.set({ key: cacheKey(tenantId), value: flow, ttlSeconds: ttl });
      }
      return flow;
    },

    async findByTenantPaginated(
      tenantId: string,
      filters: FlowFilters,
    ): Promise<PaginatedResult<FlowEntity>> {
      return inner.findByTenantPaginated(tenantId, filters);
    },

    async save(flow: FlowEntity): Promise<FlowEntity> {
      return inner.save(flow);
    },

    async updateStatus(
      tenantId: string,
      flowId: FlowId,
      status: FlowStatus,
      deletedAt?: Date | null,
    ): Promise<FlowEntity> {
      const result = await inner.updateStatus(tenantId, flowId, status, deletedAt);
      await cache.delete(cacheKey(tenantId));
      return result;
    },

    async softDelete(tenantId: string, flowId: FlowId): Promise<void> {
      await inner.softDelete(tenantId, flowId);
      await cache.delete(cacheKey(tenantId));
    },
  };
}

export { cacheKey as flowCacheKey };
