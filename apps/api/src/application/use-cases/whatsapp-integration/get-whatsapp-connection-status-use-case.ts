/** Consulta status de conexão da instância via port do provedor (RN-029). */

import type {
  WhatsAppConnectionPort,
  WhatsAppInstanceRepositoryPort,
} from "../../../domain/ports/whatsapp-ports";
import type { WhatsAppConnectionState } from "../../../domain/whatsapp-connection-types";
import type { EvolutionPlatformConfig } from "../../../domain/whatsapp-platform-types";
import type { WhatsAppProvider } from "../../../domain/whatsapp-types";
import { createWhatsAppInstanceId } from "../../../domain/whatsapp-types";
import { resolveWhatsAppInstanceConfig } from "../../services/whatsapp-instance-config-resolver";

type ConnectionResolver = (provider: WhatsAppProvider) => WhatsAppConnectionPort;

type GetWhatsAppConnectionStatusInput = Readonly<{
  tenantId: string;
  instanceId: string;
}>;

type GetWhatsAppConnectionStatusOutput = Readonly<{
  status: WhatsAppConnectionState;
}>;

type GetWhatsAppConnectionStatusUseCase = Readonly<{
  execute: (input: GetWhatsAppConnectionStatusInput) => Promise<GetWhatsAppConnectionStatusOutput>;
}>;

export function createGetWhatsAppConnectionStatusUseCase(deps: {
  instanceRepository: WhatsAppInstanceRepositoryPort;
  evolutionPlatform: EvolutionPlatformConfig | null;
  resolveConnection: ConnectionResolver;
}): GetWhatsAppConnectionStatusUseCase {
  return {
    async execute(
      input: GetWhatsAppConnectionStatusInput,
    ): Promise<GetWhatsAppConnectionStatusOutput> {
      const instance = await deps.instanceRepository.findByTenantAndId(
        input.tenantId,
        createWhatsAppInstanceId(input.instanceId),
      );

      if (!instance) {
        throw new Error("WHATSAPP_NOT_FOUND");
      }

      const config = resolveWhatsAppInstanceConfig(instance, deps.evolutionPlatform);
      const connection = deps.resolveConnection(instance.provider);
      const status = await connection.getStatus(config);

      return { status };
    },
  };
}

export type {
  GetWhatsAppConnectionStatusInput,
  GetWhatsAppConnectionStatusOutput,
  GetWhatsAppConnectionStatusUseCase,
};
