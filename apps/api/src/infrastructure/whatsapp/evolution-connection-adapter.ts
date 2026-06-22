/** Adapter de conexão Evolution API — status, QR e logout (RN-029). */
import type { WhatsAppConnectionPort } from "../../domain/ports/whatsapp-ports";
import type {
  WhatsAppConnectionState,
  WhatsAppConnectionStatus,
  WhatsAppPairingResult,
} from "../../domain/whatsapp-connection-types";
import type { EvolutionInstanceConfig, WhatsAppInstanceConfig } from "../../domain/whatsapp-types";

const QR_TTL_MS = 60_000;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function extractEvolutionConfig(config: WhatsAppInstanceConfig): EvolutionInstanceConfig {
  if (config.provider !== "evolution") {
    throw new Error("Config inválida: provider não é evolution.");
  }
  return config.config;
}

function normalizeEvolutionState(rawState: string): WhatsAppConnectionStatus {
  const normalized = rawState.toLowerCase();
  if (normalized === "open") {
    return "connected";
  }
  if (normalized === "connecting") {
    return "connecting";
  }
  if (normalized === "close" || normalized === "closed") {
    return "disconnected";
  }
  return "error";
}

async function evolutionFetch(
  config: EvolutionInstanceConfig,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${config.apiUrl}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      apikey: config.apiKey,
      ...(init?.headers ?? {}),
    },
  });
}

function createEvolutionConnectionAdapter(): WhatsAppConnectionPort {
  return {
    async getStatus(instanceConfig: WhatsAppInstanceConfig): Promise<WhatsAppConnectionState> {
      const config = extractEvolutionConfig(instanceConfig);

      try {
        const response = await evolutionFetch(
          config,
          `/instance/connectionState/${config.instanceName}`,
        );

        if (!response.ok) {
          return {
            status: "error",
            reason: `Evolution retornou HTTP ${response.status}.`,
          };
        }

        const body = (await response.json()) as unknown;
        const instance = isRecord(body) && isRecord(body.instance) ? body.instance : null;
        const rawState = typeof instance?.state === "string" ? instance.state : "unknown";
        const status = normalizeEvolutionState(rawState);

        if (status === "error") {
          return { status, reason: `Estado desconhecido: ${rawState}` };
        }

        return { status };
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Falha ao consultar Evolution API.";
        return { status: "error", reason };
      }
    },

    async startPairing(instanceConfig: WhatsAppInstanceConfig): Promise<WhatsAppPairingResult> {
      const config = extractEvolutionConfig(instanceConfig);

      const response = await evolutionFetch(config, `/instance/connect/${config.instanceName}`);
      if (!response.ok) {
        throw new Error(`EVOLUTION_PAIR_FAILED: HTTP ${response.status}`);
      }

      const body = (await response.json()) as unknown;
      const base64 =
        isRecord(body) && typeof body.base64 === "string"
          ? body.base64.replace(/^data:image\/png;base64,/, "")
          : null;

      if (!base64) {
        throw new Error("EVOLUTION_PAIR_FAILED: QR base64 ausente na resposta.");
      }

      return {
        qrBase64: base64,
        expiresAt: Date.now() + QR_TTL_MS,
      };
    },

    async disconnect(instanceConfig: WhatsAppInstanceConfig): Promise<void> {
      const config = extractEvolutionConfig(instanceConfig);
      const response = await evolutionFetch(config, `/instance/logout/${config.instanceName}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`EVOLUTION_DISCONNECT_FAILED: HTTP ${response.status}`);
      }
    },
  };
}

export { createEvolutionConnectionAdapter };
