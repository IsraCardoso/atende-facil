/** Adapter Z-API. Normaliza webhooks, verifica Client-Token header e envia mensagens via REST. */
import type {
  InboundNormalizer,
  WebhookVerificationInput,
  WebhookVerificationResult,
  WebhookVerifier,
  WhatsAppSenderPort,
} from "../../domain/ports/whatsapp-ports";
import type {
  CanonicalDeliveryStatus,
  CanonicalInboundMessage,
  CanonicalOutboundMessage,
  WhatsAppInstanceConfig,
  ZapiInstanceConfig,
} from "../../domain/whatsapp-types";
import { createPhone, createWhatsAppMessageId } from "../../domain/whatsapp-types";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function extractZapiConfig(config: WhatsAppInstanceConfig): ZapiInstanceConfig {
  if (config.provider !== "zapi") {
    throw new Error("Config inválida: provider não é zapi.");
  }
  return config.config;
}

function resolveZapiMessageId(rawPayload: Readonly<Record<string, unknown>>): string | null {
  if (typeof rawPayload.messageId === "string") {
    return rawPayload.messageId;
  }

  if (typeof rawPayload.id === "string") {
    return rawPayload.id;
  }

  return null;
}

function resolveZapiText(rawPayload: Readonly<Record<string, unknown>>): string | null {
  const textObj = isRecord(rawPayload.text) ? rawPayload.text : null;
  if (typeof textObj?.message === "string") {
    return textObj.message;
  }

  if (typeof rawPayload.body === "string") {
    return rawPayload.body;
  }

  return null;
}

function createZapiNormalizer(): InboundNormalizer {
  return {
    normalize(rawPayload: unknown): CanonicalInboundMessage | null {
      if (!isRecord(rawPayload)) {
        return null;
      }

      const phone = typeof rawPayload.phone === "string" ? rawPayload.phone : null;
      const messageId = resolveZapiMessageId(rawPayload);
      const text = resolveZapiText(rawPayload);
      const timestamp =
        typeof rawPayload.mompiessent === "number" ? rawPayload.mompiessent : Date.now();

      if (!phone || !messageId || !text) {
        return null;
      }

      const cleanPhone = phone.replace(/@.*$/, "");

      return {
        messageId: createWhatsAppMessageId(messageId),
        from: createPhone(cleanPhone),
        text,
        timestamp,
        provider: "zapi",
        rawPayload: rawPayload as Readonly<Record<string, unknown>>,
      };
    },
  };
}

function createZapiVerifier(): WebhookVerifier {
  return {
    verify(input: WebhookVerificationInput): WebhookVerificationResult {
      const config = extractZapiConfig(input.instanceConfig);
      const clientToken =
        input.headers["client-token"] ??
        input.headers["Client-Token"] ??
        input.headers["CLIENT-TOKEN"];

      if (!clientToken || clientToken !== config.clientToken) {
        return { valid: false, reason: "Header Client-Token ausente ou inválido." };
      }

      return { valid: true };
    },
  };
}

function createZapiSender(): WhatsAppSenderPort {
  return {
    async sendText(
      config: WhatsAppInstanceConfig,
      message: CanonicalOutboundMessage,
    ): Promise<CanonicalDeliveryStatus> {
      const zapiConfig = extractZapiConfig(config);
      const url = `https://api.z-api.io/instances/${zapiConfig.instanceId}/token/${zapiConfig.token}/send-text`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": zapiConfig.clientToken,
        },
        body: JSON.stringify({
          phone: message.to,
          message: message.text,
        }),
      });

      const responseBody = (await response.json()) as Record<string, unknown>;
      const sentId =
        typeof responseBody.messageId === "string" ? responseBody.messageId : `zapi-${Date.now()}`;

      return {
        messageId: createWhatsAppMessageId(sentId),
        status: response.ok ? "sent" : "failed",
        timestamp: Date.now(),
      };
    },
  };
}

/** Cria bundle completo (sender + normalizer + verifier) para Z-API. */
export function createZapiAdapter() {
  return {
    sender: createZapiSender(),
    normalizer: createZapiNormalizer(),
    verifier: createZapiVerifier(),
  };
}
