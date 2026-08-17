/** Resolve config completa de instância mesclando JSONB do tenant com credenciais de plataforma (Evolution gerenciada). */
import type { EvolutionPlatformConfig } from "../../domain/whatsapp-platform-types";
import type {
  EvolutionInstanceConfig,
  MetaInstanceConfig,
  WhatsAppInstanceConfig,
  WhatsAppInstanceEntity,
  WhatsAppProvider,
} from "../../domain/whatsapp-types";

function readStringField(config: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = config[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function resolveEvolutionConfig(
  entity: WhatsAppInstanceEntity,
  platform: EvolutionPlatformConfig,
): WhatsAppInstanceConfig {
  const instanceName = readStringField(entity.config, "instanceName");
  if (!instanceName) {
    throw new Error("WHATSAPP_CONFIG_INVALID: instanceName ausente para Evolution.");
  }

  const config: EvolutionInstanceConfig = {
    instanceName,
    apiUrl: platform.apiUrl,
    apiKey: platform.apiKey,
  };

  return { provider: "evolution", config };
}

function resolveMetaConfig(entity: WhatsAppInstanceEntity): WhatsAppInstanceConfig {
  const phoneNumberId = readStringField(entity.config, "phoneNumberId");
  const accessToken = readStringField(entity.config, "accessToken");
  const verifyToken = readStringField(entity.config, "verifyToken");
  const apiVersion = readStringField(entity.config, "apiVersion") ?? "v21.0";

  if (!phoneNumberId || !accessToken || !verifyToken) {
    throw new Error("WHATSAPP_CONFIG_INVALID: credenciais Meta incompletas.");
  }

  const config: MetaInstanceConfig = {
    phoneNumberId,
    accessToken,
    verifyToken,
    apiVersion,
  };

  return { provider: "meta", config };
}

function assertNeverProvider(value: never): never {
  throw new Error(`Provider não suportado: ${JSON.stringify(value)}`);
}

export function resolveWhatsAppInstanceConfig(
  entity: WhatsAppInstanceEntity,
  evolutionPlatform: EvolutionPlatformConfig | null,
): WhatsAppInstanceConfig {
  const provider: WhatsAppProvider = entity.provider;

  switch (provider) {
    case "evolution": {
      if (!evolutionPlatform) {
        throw new Error("WHATSAPP_PLATFORM_UNAVAILABLE: Evolution não configurada no ambiente.");
      }
      return resolveEvolutionConfig(entity, evolutionPlatform);
    }
    case "meta":
      return resolveMetaConfig(entity);
    case "zapi":
    case "uazapi":
      throw new Error(`WHATSAPP_PROVIDER_UNSUPPORTED_UI: ${provider}`);
    default:
      return assertNeverProvider(provider);
  }
}
