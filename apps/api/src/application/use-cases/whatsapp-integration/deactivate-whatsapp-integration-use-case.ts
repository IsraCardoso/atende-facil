/** Desativa integração WhatsApp — deprovisiona Evolution e remove registro do tenant (RN-029). */

import type {
  WhatsAppConnectionPort,
  WhatsAppInstanceProvisionerPort,
  WhatsAppInstanceRepositoryPort,
} from "../../../domain/ports/whatsapp-ports";
import type { EvolutionPlatformConfig } from "../../../domain/whatsapp-platform-types";
import type { WhatsAppProvider } from "../../../domain/whatsapp-types";
import { createWhatsAppInstanceId } from "../../../domain/whatsapp-types";
import { resolveWhatsAppInstanceConfig } from "../../services/whatsapp-instance-config-resolver";

type ConnectionResolver = (provider: WhatsAppProvider) => WhatsAppConnectionPort;

type DeactivateWhatsAppIntegrationInput = Readonly<{
  tenantId: string;
  instanceId: string;
}>;

type DeactivateWhatsAppIntegrationOutput = Readonly<{
  success: true;
}>;

type DeactivateWhatsAppIntegrationUseCase = Readonly<{
  execute: (
    input: DeactivateWhatsAppIntegrationInput,
  ) => Promise<DeactivateWhatsAppIntegrationOutput>;
}>;

function readInstanceName(config: Readonly<Record<string, unknown>>): string | null {
  const value = config.instanceName;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function createDeactivateWhatsAppIntegrationUseCase(deps: {
  instanceRepository: WhatsAppInstanceRepositoryPort;
  evolutionPlatform: EvolutionPlatformConfig | null;
  evolutionProvisioner: WhatsAppInstanceProvisionerPort | null;
  resolveConnection: ConnectionResolver;
}): DeactivateWhatsAppIntegrationUseCase {
  return {
    async execute(
      input: DeactivateWhatsAppIntegrationInput,
    ): Promise<DeactivateWhatsAppIntegrationOutput> {
      const instanceId = createWhatsAppInstanceId(input.instanceId);
      const instance = await deps.instanceRepository.findByTenantAndId(input.tenantId, instanceId);

      if (!instance) {
        throw new Error("WHATSAPP_NOT_FOUND");
      }

      if (instance.provider === "evolution") {
        if (!deps.evolutionPlatform || !deps.evolutionProvisioner) {
          throw new Error("WHATSAPP_PLATFORM_UNAVAILABLE");
        }

        const config = resolveWhatsAppInstanceConfig(instance, deps.evolutionPlatform);
        const connection = deps.resolveConnection(instance.provider);

        try {
          await connection.disconnect(config);
        } catch {
          // Best-effort logout antes de remover instância na Evolution.
        }

        const instanceName = readInstanceName(instance.config);
        if (instanceName) {
          await deps.evolutionProvisioner.removeEvolutionInstance(instanceName);
        }
      }

      await deps.instanceRepository.deleteByTenantAndId(input.tenantId, instanceId);

      return { success: true };
    },
  };
}

export type {
  DeactivateWhatsAppIntegrationInput,
  DeactivateWhatsAppIntegrationOutput,
  DeactivateWhatsAppIntegrationUseCase,
};
