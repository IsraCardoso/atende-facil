/** Testes do CachedFlowRepository — valida cache hit, miss, e invalidacao. */
import { describe, expect, it, vi } from "vitest";
import type { FlowEntity } from "../../domain/flow-types";
import type { CachePort } from "../../domain/ports/auth-ports";
import type { FlowRepositoryPort } from "../../domain/ports/flow-ports";
import { createCachedFlowRepository } from "./cached-flow-repository";

function createMockCachePort(): CachePort {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null) as CachePort["get"],
    set: vi.fn(async ({ key, value }) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  };
}

const flowEntity: FlowEntity = {
  id: "flow-1" as FlowEntity["id"],
  tenantId: "tenant-1",
  name: "Test Flow",
  description: null,
  definition: { nodes: [], edges: [] },
  status: "active",
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

function createMockFlowRepo(): FlowRepositoryPort {
  return {
    findById: vi.fn().mockResolvedValue(flowEntity),
    findActiveByTenant: vi.fn().mockResolvedValue(flowEntity),
    findByTenantPaginated: vi
      .fn()
      .mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, hasMore: false }),
    save: vi.fn().mockResolvedValue(flowEntity),
    updateStatus: vi.fn().mockResolvedValue(flowEntity),
    activateExclusive: vi
      .fn()
      .mockResolvedValue({ ok: true, activated: flowEntity, previousActiveFlow: null }),
    softDelete: vi.fn().mockResolvedValue(undefined),
  };
}

describe("CachedFlowRepository", () => {
  it("should return from cache on cache hit", async () => {
    const cache = createMockCachePort();
    const inner = createMockFlowRepo();
    const cached = createCachedFlowRepository(inner, cache);

    await cached.findActiveByTenant("tenant-1");

    expect(inner.findActiveByTenant).toHaveBeenCalledOnce();
    expect(cache.set).toHaveBeenCalledOnce();

    const result = await cached.findActiveByTenant("tenant-1");

    expect(result?.id).toBe("flow-1");
    expect(inner.findActiveByTenant).toHaveBeenCalledOnce();
  });

  it("should fetch from inner repo on cache miss", async () => {
    const cache = createMockCachePort();
    const inner = createMockFlowRepo();
    const cached = createCachedFlowRepository(inner, cache);

    const result = await cached.findActiveByTenant("tenant-1");

    expect(result?.id).toBe("flow-1");
    expect(inner.findActiveByTenant).toHaveBeenCalledWith("tenant-1");
    expect(cache.set).toHaveBeenCalled();
  });

  it("should invalidate cache on updateStatus", async () => {
    const cache = createMockCachePort();
    const inner = createMockFlowRepo();
    const cached = createCachedFlowRepository(inner, cache);

    await cached.findActiveByTenant("tenant-1");
    await cached.updateStatus("tenant-1", "flow-1" as FlowEntity["id"], "archived");

    expect(cache.delete).toHaveBeenCalledWith("flow:active:tenant-1");
  });

  it("should invalidate cache on softDelete", async () => {
    const cache = createMockCachePort();
    const inner = createMockFlowRepo();
    const cached = createCachedFlowRepository(inner, cache);

    await cached.findActiveByTenant("tenant-1");
    await cached.softDelete("tenant-1", "flow-1" as FlowEntity["id"]);

    expect(cache.delete).toHaveBeenCalledWith("flow:active:tenant-1");
  });

  it("should invalidate cache on activateExclusive", async () => {
    const cache = createMockCachePort();
    const inner = createMockFlowRepo();
    const cached = createCachedFlowRepository(inner, cache);

    await cached.findActiveByTenant("tenant-1");
    await cached.activateExclusive("tenant-1", "flow-1" as FlowEntity["id"]);

    expect(inner.activateExclusive).toHaveBeenCalledWith("tenant-1", "flow-1");
    expect(cache.delete).toHaveBeenCalledWith("flow:active:tenant-1");
  });

  it("should delegate findById directly without cache", async () => {
    const cache = createMockCachePort();
    const inner = createMockFlowRepo();
    const cached = createCachedFlowRepository(inner, cache);

    await cached.findById("tenant-1", "flow-1" as FlowEntity["id"]);

    expect(inner.findById).toHaveBeenCalledWith("tenant-1", "flow-1");
    expect(cache.get).not.toHaveBeenCalled();
  });
});
