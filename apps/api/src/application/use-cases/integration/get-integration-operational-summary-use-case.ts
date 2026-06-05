/** Agrega status operacional WhatsApp + fluxo ativo do tenant (settings dashboard). */

import type { FlowRepositoryPort } from "../../../domain/ports/flow-ports";
import type {
  WhatsAppConnectionPort,
  WhatsAppInstanceRepositoryPort,
} from "../../../domain/ports/whatsapp-ports";
import type {
  WhatsAppConnectionState,
  WhatsAppConnectionStatus,
} from "../../../domain/whatsapp-connection-types";
import type { EvolutionPlatformConfig } from "../../../domain/whatsapp-platform-types";
import type { WhatsAppInstanceEntity, WhatsAppProvider } from "../../../domain/whatsapp-types";
import { resolveWhatsAppInstanceConfig } from "../../services/whatsapp-instance-config-resolver";

type ConnectionResolver = (provider: WhatsAppProvider) => WhatsAppConnectionPort;

type OperationalWhatsAppSummary = Readonly<{
  configured: boolean;
  instanceId?: string;
  displayName?: string | null;
  connectionStatus?: WhatsAppConnectionStatus;
  phone?: string;
  reason?: string;
}>;

type OperationalActiveFlowSummary = Readonly<{
  id: string;
  name: string;
}>;

type OperationalPlatformSummary = Readonly<{
  available: boolean;
  reason?: string;
}>;

type GetIntegrationOperationalSummaryInput = Readonly<{
  tenantId: string;
}>;

type GetIntegrationOperationalSummaryOutput = Readonly<{
  whatsapp: OperationalWhatsAppSummary;
  activeFlow: OperationalActiveFlowSummary | null;
  platform: OperationalPlatformSummary;
}>;

type GetIntegrationOperationalSummaryUseCase = Readonly<{
  execute: (
    input: GetIntegrationOperationalSummaryInput,
  ) => Promise<GetIntegrationOperationalSummaryOutput>;
}>;

function resolvePrimaryInstance(
  instances: readonly WhatsAppInstanceEntity[],
): WhatsAppInstanceEntity | null {
  return instances.find((item) => item.isPrimary) ?? instances[0] ?? null;
}

async function resolveConnectionState(
  instance: WhatsAppInstanceEntity,
  deps: {
    evolutionPlatform: EvolutionPlatformConfig | null;
    resolveConnection: ConnectionResolver;
  },
): Promise<WhatsAppConnectionState> {
  try {
    const config = resolveWhatsAppInstanceConfig(instance, deps.evolutionPlatform);
    const connection = deps.resolveConnection(instance.provider);
    return await connection.getStatus(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "WHATSAPP_STATUS_UNAVAILABLE";
    return {
      status: "error",
      reason: message,
    };
  }
}

function buildPlatformSummary(
  evolutionPlatform: EvolutionPlatformConfig | null,
  platformDiagnostics: OperationalPlatformSummary,
): OperationalPlatformSummary {
  if (evolutionPlatform) {
    return { available: true };
  }

  return platformDiagnostics;
}

export function createGetIntegrationOperationalSummaryUseCase(deps: {
  instanceRepository: WhatsAppInstanceRepositoryPort;
  flowRepository: FlowRepositoryPort;
  evolutionPlatform: EvolutionPlatformConfig | null;
  platformDiagnostics: OperationalPlatformSummary;
  resolveConnection: ConnectionResolver;
}): GetIntegrationOperationalSummaryUseCase {
  return {
    async execute(
      input: GetIntegrationOperationalSummaryInput,
    ): Promise<GetIntegrationOperationalSummaryOutput> {
      const [instances, activeFlowEntity] = await Promise.all([
        deps.instanceRepository.listByTenant(input.tenantId),
        deps.flowRepository.findActiveByTenant(input.tenantId),
      ]);

      const primary = resolvePrimaryInstance(instances);
      const activeFlow = activeFlowEntity
        ? { id: String(activeFlowEntity.id), name: activeFlowEntity.name }
        : null;
      const platform = buildPlatformSummary(deps.evolutionPlatform, deps.platformDiagnostics);

      if (!primary) {
        return {
          whatsapp: { configured: false },
          activeFlow,
          platform,
        };
      }

      const connection = await resolveConnectionState(primary, deps);

      return {
        whatsapp: {
          configured: true,
          instanceId: String(primary.id),
          displayName: primary.displayName,
          connectionStatus: connection.status,
          ...(connection.phone !== undefined ? { phone: connection.phone } : {}),
          ...(connection.reason !== undefined ? { reason: connection.reason } : {}),
        },
        activeFlow,
        platform,
      };
    },
  };
}

export type {
  GetIntegrationOperationalSummaryInput,
  GetIntegrationOperationalSummaryOutput,
  GetIntegrationOperationalSummaryUseCase,
  OperationalActiveFlowSummary,
  OperationalPlatformSummary,
  OperationalWhatsAppSummary,
};
