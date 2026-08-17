import { describe, expect, it, vi } from "vitest";
import { createWhatsAppInstanceId } from "../../../domain/whatsapp-types";
import { createListWhatsAppInstancesUseCase } from "./list-whatsapp-instances-use-case";

describe("createListWhatsAppInstancesUseCase", () => {
  it("should mask evolution secrets when listing instances", async () => {
    const useCase = createListWhatsAppInstancesUseCase({
      publicApiUrl: "http://localhost:3000",
      instanceRepository: {
        findByTenantAndId: vi.fn(),
        findActiveByTenant: vi.fn(),
        listByTenant: vi.fn().mockResolvedValue([
          {
            id: createWhatsAppInstanceId("i-1"),
            tenantId: "t-1",
            provider: "evolution",
            displayName: "WhatsApp",
            config: { instanceName: "af-demo", apiKey: "secret-key" },
            active: true,
            isPrimary: true,
            createdAt: new Date("2026-01-01"),
            updatedAt: new Date("2026-01-02"),
          },
        ]),
        save: vi.fn(),
        setPrimary: vi.fn(),
        deleteByTenantAndId: vi.fn(),
      },
    });

    const result = await useCase.execute({ tenantId: "t-1" });

    expect(result.instances).toHaveLength(1);
    expect(result.instances[0]?.config.apiKey).toBeUndefined();
    expect(result.instances[0]?.config.platformManaged).toBe(true);
    expect(result.instances[0]?.webhookUrl).toContain("/webhook/t-1/whatsapp/i-1");
  });
});
