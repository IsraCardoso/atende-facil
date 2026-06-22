import { describe, expect, it, vi } from "vitest";

import { createWhatsAppInstanceId } from "../../../domain/whatsapp-types";
import { createDeactivateWhatsAppIntegrationUseCase } from "./deactivate-whatsapp-integration-use-case";

const mockInstance = {
  id: createWhatsAppInstanceId("inst-1"),
  tenantId: "tenant-1",
  provider: "evolution" as const,
  displayName: "WhatsApp",
  config: { instanceName: "af-demo" },
  active: true,
  isPrimary: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("createDeactivateWhatsAppIntegrationUseCase", () => {
  it("should disconnect, deprovision and delete instance when evolution is configured", async () => {
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const removeEvolutionInstance = vi.fn().mockResolvedValue(undefined);
    const deleteByTenantAndId = vi.fn().mockResolvedValue(undefined);
    const findByTenantAndId = vi.fn().mockResolvedValue(mockInstance);

    const useCase = createDeactivateWhatsAppIntegrationUseCase({
      evolutionPlatform: { apiUrl: "http://evo", apiKey: "key" },
      evolutionProvisioner: { ensureEvolutionInstance: vi.fn(), removeEvolutionInstance },
      resolveConnection: () => ({ getStatus: vi.fn(), startPairing: vi.fn(), disconnect }),
      instanceRepository: {
        findByTenantAndId,
        findActiveByTenant: vi.fn(),
        listByTenant: vi.fn(),
        save: vi.fn(),
        setPrimary: vi.fn(),
        deleteByTenantAndId,
      },
    });

    const result = await useCase.execute({ tenantId: "tenant-1", instanceId: "inst-1" });

    expect(result).toEqual({ success: true });
    expect(disconnect).toHaveBeenCalledOnce();
    expect(removeEvolutionInstance).toHaveBeenCalledWith("af-demo");
    expect(deleteByTenantAndId).toHaveBeenCalledWith("tenant-1", mockInstance.id);
  });

  it("should throw WHATSAPP_NOT_FOUND when instance is missing", async () => {
    const useCase = createDeactivateWhatsAppIntegrationUseCase({
      evolutionPlatform: { apiUrl: "http://evo", apiKey: "key" },
      evolutionProvisioner: { ensureEvolutionInstance: vi.fn(), removeEvolutionInstance: vi.fn() },
      resolveConnection: () => ({
        getStatus: vi.fn(),
        startPairing: vi.fn(),
        disconnect: vi.fn(),
      }),
      instanceRepository: {
        findByTenantAndId: vi.fn().mockResolvedValue(null),
        findActiveByTenant: vi.fn(),
        listByTenant: vi.fn(),
        save: vi.fn(),
        setPrimary: vi.fn(),
        deleteByTenantAndId: vi.fn(),
      },
    });

    await expect(useCase.execute({ tenantId: "tenant-1", instanceId: "missing" })).rejects.toThrow(
      "WHATSAPP_NOT_FOUND",
    );
  });
});
