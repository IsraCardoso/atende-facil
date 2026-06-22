/** Provisiona instância Evolution por tenant e configura webhook (plataforma gerenciada). */
import type { WhatsAppInstanceProvisionerPort } from "../../domain/ports/whatsapp-ports";
import type { EvolutionPlatformConfig } from "../../domain/whatsapp-platform-types";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

async function evolutionRequest(
  platform: EvolutionPlatformConfig,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${platform.apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: platform.apiKey,
      ...(init?.headers ?? {}),
    },
  });
}

export function createEvolutionInstanceProvisioner(
  platform: EvolutionPlatformConfig,
): WhatsAppInstanceProvisionerPort {
  return {
    async ensureEvolutionInstance(instanceName: string, webhookUrl: string): Promise<void> {
      const createResponse = await evolutionRequest(platform, "/instance/create", {
        method: "POST",
        body: JSON.stringify({
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: false,
        }),
      });

      if (!createResponse.ok && createResponse.status !== 403 && createResponse.status !== 409) {
        const text = await createResponse.text();
        throw new Error(
          `EVOLUTION_PROVISION_FAILED: create HTTP ${createResponse.status} — ${text.slice(0, 200)}`,
        );
      }

      const webhookResponse = await evolutionRequest(platform, `/webhook/set/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: false,
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
          },
        }),
      });

      if (!webhookResponse.ok) {
        const text = await webhookResponse.text();
        throw new Error(
          `EVOLUTION_PROVISION_FAILED: webhook HTTP ${webhookResponse.status} — ${text.slice(0, 200)}`,
        );
      }

      const body = (await webhookResponse.json()) as unknown;
      if (isRecord(body) && body.enabled === false) {
        throw new Error("EVOLUTION_PROVISION_FAILED: webhook não habilitado na Evolution.");
      }
    },

    async removeEvolutionInstance(instanceName: string): Promise<void> {
      const response = await evolutionRequest(
        platform,
        `/instance/delete/${encodeURIComponent(instanceName)}`,
        { method: "DELETE" },
      );

      if (!response.ok && response.status !== 404) {
        const text = await response.text();
        throw new Error(
          `EVOLUTION_DEPROVISION_FAILED: delete HTTP ${response.status} — ${text.slice(0, 200)}`,
        );
      }
    },
  };
}
