/** Inicia pareamento QR para instância WhatsApp (RN-029). */

import type {
  WhatsAppConnectionPort,
  WhatsAppInstanceRepositoryPort,
} from "../../../domain/ports/whatsapp-ports";
import type { WhatsAppPairingResult } from "../../../domain/whatsapp-connection-types";
import type { EvolutionPlatformConfig } from "../../../domain/whatsapp-platform-types";
import type { WhatsAppProvider } from "../../../domain/whatsapp-types";
import { createWhatsAppInstanceId } from "../../../domain/whatsapp-types";
import { resolveWhatsAppInstanceConfig } from "../../services/whatsapp-instance-config-resolver";

type ConnectionResolver = (provider: WhatsAppProvider) => WhatsAppConnectionPort;

type StartWhatsAppPairingInput = Readonly<{
  tenantId: string;
  instanceId: string;
}>;

type StartWhatsAppPairingOutput = Readonly<{
  pairing: WhatsAppPairingResult;
}>;

type StartWhatsAppPairingUseCase = Readonly<{
  execute: (input: StartWhatsAppPairingInput) => Promise<StartWhatsAppPairingOutput>;
}>;

export function createStartWhatsAppPairingUseCase(deps: {
  instanceRepository: WhatsAppInstanceRepositoryPort;
  evolutionPlatform: EvolutionPlatformConfig | null;
  resolveConnection: ConnectionResolver;
}): StartWhatsAppPairingUseCase {
  return {
    async execute(input: StartWhatsAppPairingInput): Promise<StartWhatsAppPairingOutput> {
      const instance = await deps.instanceRepository.findByTenantAndId(
        input.tenantId,
        createWhatsAppInstanceId(input.instanceId),
      );

      if (!instance) {
        throw new Error("WHATSAPP_NOT_FOUND");
      }

      const config = resolveWhatsAppInstanceConfig(instance, deps.evolutionPlatform);
      const connection = deps.resolveConnection(instance.provider);

      try {
        const pairing = await connection.startPairing(config);
        return { pairing };
      } catch (error) {
        if (error instanceof Error && error.message === "WHATSAPP_PAIRING_NOT_SUPPORTED") {
          throw error;
        }
        throw new Error(error instanceof Error ? error.message : "WHATSAPP_PAIR_FAILED");
      }
    },
  };
}

export type { StartWhatsAppPairingInput, StartWhatsAppPairingOutput, StartWhatsAppPairingUseCase };
