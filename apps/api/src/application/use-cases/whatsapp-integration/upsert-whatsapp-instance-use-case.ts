/** Cria ou atualiza instância WhatsApp do tenant — Evolution gerenciada pela plataforma (RN-029). */

import type {
  WhatsAppInstanceProvisionerPort,
  WhatsAppInstanceRepositoryPort,
} from "../../../domain/ports/whatsapp-ports";
import type { MaskedWhatsAppInstanceDto } from "../../../domain/whatsapp-connection-types";
import type { EvolutionPlatformConfig } from "../../../domain/whatsapp-platform-types";
import type {
  WhatsAppInstanceEntity,
  WhatsAppInstanceId,
  WhatsAppProvider,
} from "../../../domain/whatsapp-types";
import { createWhatsAppInstanceId, isValidWhatsAppProvider } from "../../../domain/whatsapp-types";
import { buildEvolutionInstanceName } from "./build-evolution-instance-name";
import { mapWhatsAppInstanceToDto } from "./map-instance-dto";

type UpsertWhatsAppInstanceInput = Readonly<{
  tenantId: string;
  tenantSlug: string;
  instanceId?: string;
  provider: string;
  displayName?: string | null;
  config?: Readonly<Record<string, unknown>>;
}>;

type UpsertWhatsAppInstanceOutput = Readonly<{
  instance: MaskedWhatsAppInstanceDto;
}>;

type UpsertWhatsAppInstanceUseCase = Readonly<{
  execute: (input: UpsertWhatsAppInstanceInput) => Promise<UpsertWhatsAppInstanceOutput>;
}>;

const SECRET_KEYS = ["apiKey", "accessToken", "token", "clientToken", "apiToken"] as const;

function mergeConfig(
  existing: Readonly<Record<string, unknown>>,
  incoming: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> {
  if (!incoming) {
    return existing;
  }

  const merged: Record<string, unknown> = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (SECRET_KEYS.includes(key as (typeof SECRET_KEYS)[number]) && value === "") {
      continue;
    }
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

function buildEvolutionConfig(tenantSlug: string): Readonly<Record<string, unknown>> {
  return { instanceName: buildEvolutionInstanceName(tenantSlug) };
}

export function createUpsertWhatsAppInstanceUseCase(deps: {
  instanceRepository: WhatsAppInstanceRepositoryPort;
  evolutionPlatform: EvolutionPlatformConfig | null;
  evolutionProvisioner: WhatsAppInstanceProvisionerPort | null;
  publicApiUrl: string;
}): UpsertWhatsAppInstanceUseCase {
  return {
    async execute(input: UpsertWhatsAppInstanceInput): Promise<UpsertWhatsAppInstanceOutput> {
      if (!isValidWhatsAppProvider(input.provider)) {
        throw new Error("WHATSAPP_INVALID_PROVIDER");
      }

      const provider: WhatsAppProvider = input.provider;
      const now = new Date();
      const instanceId: WhatsAppInstanceId = input.instanceId
        ? createWhatsAppInstanceId(input.instanceId)
        : createWhatsAppInstanceId(crypto.randomUUID());

      const existing = input.instanceId
        ? await deps.instanceRepository.findByTenantAndId(input.tenantId, instanceId)
        : null;

      if (input.instanceId && !existing) {
        throw new Error("WHATSAPP_NOT_FOUND");
      }

      let config: Readonly<Record<string, unknown>>;

      if (provider === "evolution") {
        if (!deps.evolutionPlatform || !deps.evolutionProvisioner) {
          throw new Error("WHATSAPP_PLATFORM_UNAVAILABLE");
        }
        config = buildEvolutionConfig(input.tenantSlug);
      } else {
        config = mergeConfig(existing?.config ?? {}, input.config);
      }

      const entity: WhatsAppInstanceEntity = {
        id: instanceId,
        tenantId: input.tenantId,
        provider,
        displayName: input.displayName ?? existing?.displayName ?? "WhatsApp",
        config,
        active: true,
        isPrimary: true,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      if (provider === "evolution" && deps.evolutionProvisioner) {
        const webhookUrl = `${deps.publicApiUrl.replace(/\/$/, "")}/webhook/${entity.tenantId}/whatsapp/${entity.id}`;
        const instanceName = String(entity.config.instanceName ?? "");
        await deps.evolutionProvisioner.ensureEvolutionInstance(instanceName, webhookUrl);
      }

      const saved = await deps.instanceRepository.save(entity);
      await deps.instanceRepository.setPrimary(input.tenantId, saved.id);

      return {
        instance: mapWhatsAppInstanceToDto(saved, deps.publicApiUrl),
      };
    },
  };
}

export type {
  UpsertWhatsAppInstanceInput,
  UpsertWhatsAppInstanceOutput,
  UpsertWhatsAppInstanceUseCase,
};
