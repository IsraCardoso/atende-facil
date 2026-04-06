import { describe, expect, it, vi } from "vitest";

import {
  createEmailAddress,
  createTenantId,
  createTenantMembershipId,
  createUserId,
} from "../../domain";
import type { AppLoggerPort, CachePort, CurrentUserProjection } from "../../domain/ports";
import { createInMemoryCacheAdapter } from "../../infrastructure/cache";
import { createIdentityCacheService } from "./identity-cache-service";

function createProjection(): CurrentUserProjection {
  return {
    user: {
      id: createUserId("user-1"),
      email: createEmailAddress("user-1@atende.dev"),
      displayName: "Usuário Teste",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    memberships: [
      {
        id: createTenantMembershipId("membership-1"),
        tenantId: createTenantId("tenant-1"),
        userId: createUserId("user-1"),
        role: "admin",
        status: "active",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
  };
}

function createLoggerSpy(): AppLoggerPort {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe("createIdentityCacheService", () => {
  it("should return cached projection on subsequent reads", async () => {
    const logger = createLoggerSpy();
    const service = createIdentityCacheService({
      cachePort: createInMemoryCacheAdapter(),
      logger,
    });
    const loader = vi.fn(async () => createProjection());

    const firstRead = await service.getOrLoad(
      {
        tenantId: createTenantId("tenant-1"),
        userId: createUserId("user-1"),
        correlationId: "corr-1",
      },
      loader,
    );
    const secondRead = await service.getOrLoad(
      {
        tenantId: createTenantId("tenant-1"),
        userId: createUserId("user-1"),
        correlationId: "corr-2",
      },
      loader,
    );

    expect(loader).toHaveBeenCalledTimes(1);
    expect(firstRead.user.id).toBe(secondRead.user.id);
    expect(secondRead.user.createdAt).toBeInstanceOf(Date);
    expect(secondRead.memberships[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("should invalidate cache entry and force reload", async () => {
    const logger = createLoggerSpy();
    const service = createIdentityCacheService({
      cachePort: createInMemoryCacheAdapter(),
      logger,
    });
    const loader = vi.fn(async () => createProjection());
    const input = {
      tenantId: createTenantId("tenant-1"),
      userId: createUserId("user-1"),
      correlationId: "corr-invalidate",
    };

    await service.getOrLoad(input, loader);
    await service.invalidate(input);
    await service.getOrLoad(input, loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("should fallback to loader when cache fails", async () => {
    const cachePort: CachePort = {
      get: async () => {
        throw new Error("cache get failure");
      },
      set: async () => {
        throw new Error("cache set failure");
      },
      delete: async () => {
        throw new Error("cache delete failure");
      },
    };
    const warnSpy = vi.fn();
    const logger: AppLoggerPort = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: warnSpy,
      error: vi.fn(),
    };
    const service = createIdentityCacheService({
      cachePort,
      logger,
    });
    const loader = vi.fn(async () => createProjection());

    const output = await service.getOrLoad(
      {
        tenantId: createTenantId("tenant-1"),
        userId: createUserId("user-1"),
        correlationId: "corr-fallback",
      },
      loader,
    );

    expect(loader).toHaveBeenCalledTimes(1);
    expect(output.user.id).toBe(createUserId("user-1"));
    expect(warnSpy).toHaveBeenCalled();
  });
});
