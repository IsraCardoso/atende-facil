import { describe, expect, it, vi } from "vitest";

import { createFlowId } from "../../../domain/flow-types";
import { createWhatsAppInstanceId } from "../../../domain/whatsapp-types";
import { createGetIntegrationOperationalSummaryUseCase } from "./get-integration-operational-summary-use-case";

const mockInstance = {
  id: createWhatsAppInstanceId("i-1"),
  tenantId: "t-1",
  provider: "evolution" as const,
  displayName: "WhatsApp",
  config: { instanceName: "af-demo" },
  active: true,
  isPrimary: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
};

const mockActiveFlow = {
  id: createFlowId("flow-1"),
  tenantId: "t-1",
  name: "Atendimento Principal",
  description: null,
  definition: {},
  status: "active" as const,
  version: 1,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
  deletedAt: null,
};

function createUseCase(overrides?: {
  instances?: readonly (typeof mockInstance)[];
  activeFlow?: typeof mockActiveFlow | null;
  connectionStatus?: "connected" | "disconnected" | "connecting" | "error";
  connectionError?: boolean;
}) {
  const getStatus = overrides?.connectionError
    ? vi.fn().mockRejectedValue(new Error("WHATSAPP_PLATFORM_UNAVAILABLE"))
    : vi.fn().mockResolvedValue({
        status: overrides?.connectionStatus ?? "connected",
        phone: "5511999999999",
      });

  return createGetIntegrationOperationalSummaryUseCase({
    evolutionPlatform: {
      apiUrl: "http://evo",
      apiKey: "key",
    },
    platformDiagnostics: { available: true },
    resolveConnection: () => ({ getStatus, startPairing: vi.fn(), disconnect: vi.fn() }),
    instanceRepository: {
      findByTenantAndId: vi.fn(),
      findActiveByTenant: vi.fn(),
      listByTenant: vi.fn().mockResolvedValue(overrides?.instances ?? []),
      save: vi.fn(),
      setPrimary: vi.fn(),
      deleteByTenantAndId: vi.fn(),
    },
    flowRepository: {
      findById: vi.fn(),
      findActiveByTenant: vi.fn().mockResolvedValue(overrides?.activeFlow ?? null),
      findByTenantPaginated: vi.fn(),
      save: vi.fn(),
      updateStatus: vi.fn(),
      softDelete: vi.fn(),
    },
  });
}

describe("createGetIntegrationOperationalSummaryUseCase", () => {
  it("should return unconfigured whatsapp when tenant has no instances", async () => {
    const useCase = createUseCase({ activeFlow: mockActiveFlow });

    const result = await useCase.execute({ tenantId: "t-1" });

    expect(result.whatsapp.configured).toBe(false);
    expect(result.activeFlow).toEqual({ id: "flow-1", name: "Atendimento Principal" });
    expect(result.platform.available).toBe(true);
  });

  it("should return platform unavailable when diagnostics report missing env", async () => {
    const useCase = createGetIntegrationOperationalSummaryUseCase({
      evolutionPlatform: null,
      platformDiagnostics: {
        available: false,
        reason: "EVOLUTION_API_KEY ausente(s) no ambiente da API.",
      },
      resolveConnection: () => ({
        getStatus: vi.fn(),
        startPairing: vi.fn(),
        disconnect: vi.fn(),
      }),
      instanceRepository: {
        findByTenantAndId: vi.fn(),
        findActiveByTenant: vi.fn(),
        listByTenant: vi.fn().mockResolvedValue([]),
        save: vi.fn(),
        setPrimary: vi.fn(),
        deleteByTenantAndId: vi.fn(),
      },
      flowRepository: {
        findById: vi.fn(),
        findActiveByTenant: vi.fn().mockResolvedValue(null),
        findByTenantPaginated: vi.fn(),
        save: vi.fn(),
        updateStatus: vi.fn(),
        softDelete: vi.fn(),
      },
    });

    const result = await useCase.execute({ tenantId: "t-1" });

    expect(result.platform).toEqual({
      available: false,
      reason: "EVOLUTION_API_KEY ausente(s) no ambiente da API.",
    });
  });

  it("should return connected whatsapp and active flow when both exist", async () => {
    const useCase = createUseCase({
      instances: [mockInstance],
      activeFlow: mockActiveFlow,
      connectionStatus: "connected",
    });

    const result = await useCase.execute({ tenantId: "t-1" });

    expect(result.whatsapp).toMatchObject({
      configured: true,
      instanceId: "i-1",
      connectionStatus: "connected",
      phone: "5511999999999",
    });
    expect(result.activeFlow).toEqual({ id: "flow-1", name: "Atendimento Principal" });
  });

  it("should return null active flow when none is active", async () => {
    const useCase = createUseCase({
      instances: [mockInstance],
      activeFlow: null,
      connectionStatus: "disconnected",
    });

    const result = await useCase.execute({ tenantId: "t-1" });

    expect(result.whatsapp.connectionStatus).toBe("disconnected");
    expect(result.activeFlow).toBeNull();
  });

  it("should map connection errors to error status when Evolution is unavailable", async () => {
    const useCase = createUseCase({
      instances: [mockInstance],
      connectionError: true,
    });

    const result = await useCase.execute({ tenantId: "t-1" });

    expect(result.whatsapp.connectionStatus).toBe("error");
    expect(result.whatsapp.reason).toBe("WHATSAPP_PLATFORM_UNAVAILABLE");
  });
});
