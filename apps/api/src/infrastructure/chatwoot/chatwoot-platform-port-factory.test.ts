/** Testes de createChatwootPlatformPortFactory: resolução per-tenant, fallback global, cache. */
import { describe, expect, it, vi } from "vitest";
import type { TenantIntegrationEntity } from "../../domain/integration-types";
import { createTenantIntegrationId } from "../../domain/integration-types";
import type { TenantIntegrationRepositoryPort } from "../../domain/ports/integration-ports";
import type { ChatwootPlatformConfig } from "./chatwoot-platform-adapter";
import { createChatwootPlatformPortFactory } from "./chatwoot-platform-port-factory";

const TENANT_ID = "tenant-1";

const GLOBAL_FALLBACK_CONFIG: ChatwootPlatformConfig = {
  apiUrl: "https://global.chatwoot.example.com",
  platformToken: "global-token",
  accountId: "global-account",
};

function buildTenantIntegration(
  overrides: Partial<TenantIntegrationEntity> = {},
): TenantIntegrationEntity {
  return {
    id: createTenantIntegrationId("integration-1"),
    tenantId: TENANT_ID,
    provider: "chatwoot",
    config: {
      apiUrl: "https://tenant.chatwoot.example.com",
      platformToken: "tenant-token",
      accountId: "tenant-account",
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createIntegrationRepositoryFake(
  behavior: {
    findByTenantAndProvider?: TenantIntegrationRepositoryPort["findByTenantAndProvider"];
  } = {},
): TenantIntegrationRepositoryPort {
  return {
    findByTenantAndProvider: behavior.findByTenantAndProvider ?? vi.fn().mockResolvedValue(null),
    save: vi.fn(),
  };
}

describe("createChatwootPlatformPortFactory", () => {
  it("should resolve per-tenant config when tenant has its own integration", async () => {
    const integrationRepository = createIntegrationRepositoryFake({
      findByTenantAndProvider: vi.fn().mockResolvedValue(buildTenantIntegration()),
    });
    const factory = createChatwootPlatformPortFactory({
      integrationRepository,
      globalFallbackConfig: GLOBAL_FALLBACK_CONFIG,
    });

    const port = await factory(TENANT_ID);

    expect(port).toBeDefined();
    expect(integrationRepository.findByTenantAndProvider).toHaveBeenCalledWith(
      TENANT_ID,
      "chatwoot",
    );
  });

  it("should fall back to global config when tenant has no integration configured", async () => {
    const integrationRepository = createIntegrationRepositoryFake({
      findByTenantAndProvider: vi.fn().mockResolvedValue(null),
    });
    const factory = createChatwootPlatformPortFactory({
      integrationRepository,
      globalFallbackConfig: GLOBAL_FALLBACK_CONFIG,
    });

    const port = await factory(TENANT_ID);

    expect(port).toBeDefined();
  });

  it("should throw when tenant has no integration and no global fallback exists", async () => {
    const integrationRepository = createIntegrationRepositoryFake({
      findByTenantAndProvider: vi.fn().mockResolvedValue(null),
    });
    const factory = createChatwootPlatformPortFactory({ integrationRepository });

    await expect(factory(TENANT_ID)).rejects.toThrow();
  });

  it("should cache the resolved port across calls for the same tenant", async () => {
    const findByTenantAndProvider = vi.fn().mockResolvedValue(buildTenantIntegration());
    const integrationRepository = createIntegrationRepositoryFake({ findByTenantAndProvider });
    const factory = createChatwootPlatformPortFactory({
      integrationRepository,
      globalFallbackConfig: GLOBAL_FALLBACK_CONFIG,
    });

    const first = await factory(TENANT_ID);
    const second = await factory(TENANT_ID);

    expect(first).toBe(second);
    expect(findByTenantAndProvider).toHaveBeenCalledTimes(1);
  });

  it("should NOT permanently cache the global fallback when the tenant lookup fails transiently (917c032)", async () => {
    const findByTenantAndProvider = vi
      .fn()
      .mockRejectedValueOnce(new Error("DB indisponível"))
      .mockResolvedValueOnce(buildTenantIntegration());
    const integrationRepository = createIntegrationRepositoryFake({ findByTenantAndProvider });
    const factory = createChatwootPlatformPortFactory({
      integrationRepository,
      globalFallbackConfig: GLOBAL_FALLBACK_CONFIG,
    });

    const duringOutage = await factory(TENANT_ID);
    expect(duringOutage).toBeDefined();

    const afterRecovery = await factory(TENANT_ID);

    expect(afterRecovery).toBeDefined();
    expect(findByTenantAndProvider).toHaveBeenCalledTimes(2);
  });

  it("should cache the global fallback when the tenant genuinely has no integration (lookup succeeded with null)", async () => {
    const findByTenantAndProvider = vi.fn().mockResolvedValue(null);
    const integrationRepository = createIntegrationRepositoryFake({ findByTenantAndProvider });
    const factory = createChatwootPlatformPortFactory({
      integrationRepository,
      globalFallbackConfig: GLOBAL_FALLBACK_CONFIG,
    });

    await factory(TENANT_ID);
    await factory(TENANT_ID);

    expect(findByTenantAndProvider).toHaveBeenCalledTimes(1);
  });
});
