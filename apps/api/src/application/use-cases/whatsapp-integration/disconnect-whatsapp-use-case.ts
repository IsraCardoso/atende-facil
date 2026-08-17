/** Desconecta instância WhatsApp no provedor (RN-029). */

import type {
  WhatsAppConnectionPort,
  WhatsAppInstanceRepositoryPort,
} from "../../../domain/ports/whatsapp-ports";
import type { EvolutionPlatformConfig } from "../../../domain/whatsapp-platform-types";
import type { WhatsAppProvider } from "../../../domain/whatsapp-types";
import { createWhatsAppInstanceId } from "../../../domain/whatsapp-types";
import { resolveWhatsAppInstanceConfig } from "../../services/whatsapp-instance-config-resolver";

type ConnectionResolver = (provider: WhatsAppProvider) => WhatsAppConnectionPort;

type DisconnectWhatsAppInput = Readonly<{
  tenantId: string;
  instanceId: string;
}>;

type DisconnectWhatsAppOutput = Readonly<{
  success: true;
}>;

type DisconnectWhatsAppUseCase = Readonly<{
  execute: (input: DisconnectWhatsAppInput) => Promise<DisconnectWhatsAppOutput>;
}>;

export function createDisconnectWhatsAppUseCase(deps: {
  instanceRepository: WhatsAppInstanceRepositoryPort;
  evolutionPlatform: EvolutionPlatformConfig | null;
  resolveConnection: ConnectionResolver;
}): DisconnectWhatsAppUseCase {
  return {
    async execute(input: DisconnectWhatsAppInput): Promise<DisconnectWhatsAppOutput> {
      const instance = await deps.instanceRepository.findByTenantAndId(
        input.tenantId,
        createWhatsAppInstanceId(input.instanceId),
      );

      if (!instance) {
        throw new Error("WHATSAPP_NOT_FOUND");
      }

      const config = resolveWhatsAppInstanceConfig(instance, deps.evolutionPlatform);
      const connection = deps.resolveConnection(instance.provider);
      await connection.disconnect(config);

      return { success: true };
    },
  };
}

export type { DisconnectWhatsAppInput, DisconnectWhatsAppOutput, DisconnectWhatsAppUseCase };
