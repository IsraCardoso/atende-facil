/** Adapter Uazapi. Normaliza webhooks, verifica Bearer token e envia mensagens via REST. */
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
  UazapiInstanceConfig,
  WhatsAppInstanceConfig,
} from "../../domain/whatsapp-types";
import { createPhone, createWhatsAppMessageId } from "../../domain/whatsapp-types";
import { createUazapiConnectionAdapter } from "./whatsapp-connection-stubs";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function extractUazapiConfig(config: WhatsAppInstanceConfig): UazapiInstanceConfig {
  if (config.provider !== "uazapi") {
    throw new Error("Config inválida: provider não é uazapi.");
  }
  return config.config;
}

function resolveUazapiPhone(rawPayload: Readonly<Record<string, unknown>>): string | null {
  if (typeof rawPayload.phone === "string") {
    return rawPayload.phone;
  }

  if (typeof rawPayload.from === "string") {
    return rawPayload.from;
  }

  return null;
}

function resolveUazapiMessageId(rawPayload: Readonly<Record<string, unknown>>): string | null {
  if (typeof rawPayload.messageId === "string") {
    return rawPayload.messageId;
  }

  if (typeof rawPayload.id === "string") {
    return rawPayload.id;
  }

  return null;
}

function resolveUazapiText(rawPayload: Readonly<Record<string, unknown>>): string | null {
  if (typeof rawPayload.message === "string") {
    return rawPayload.message;
  }

  if (typeof rawPayload.body === "string") {
    return rawPayload.body;
  }

  return null;
}

function createUazapiNormalizer(): InboundNormalizer {
  return {
    normalize(rawPayload: unknown): CanonicalInboundMessage | null {
      if (!isRecord(rawPayload)) {
        return null;
      }

      const phone = resolveUazapiPhone(rawPayload);
      const messageId = resolveUazapiMessageId(rawPayload);
      const text = resolveUazapiText(rawPayload);
      const timestamp =
        typeof rawPayload.timestamp === "number" ? rawPayload.timestamp : Date.now();

      if (!phone || !messageId || !text) {
        return null;
      }

      const cleanPhone = phone.replace(/@.*$/, "");

      return {
        messageId: createWhatsAppMessageId(messageId),
        from: createPhone(cleanPhone),
        text,
        timestamp,
        provider: "uazapi",
        rawPayload: rawPayload as Readonly<Record<string, unknown>>,
      };
    },
  };
}

function createUazapiVerifier(): WebhookVerifier {
  return {
    verify(input: WebhookVerificationInput): WebhookVerificationResult {
      const config = extractUazapiConfig(input.instanceConfig);
      const authHeader = input.headers.authorization ?? input.headers.Authorization;

      if (!authHeader) {
        return { valid: false, reason: "Header Authorization ausente." };
      }

      const expectedToken = `Bearer ${config.apiToken}`;
      if (authHeader !== expectedToken) {
        return { valid: false, reason: "Token de autorização inválido." };
      }

      return { valid: true };
    },
  };
}

function createUazapiSender(): WhatsAppSenderPort {
  return {
    async sendText(
      config: WhatsAppInstanceConfig,
      message: CanonicalOutboundMessage,
    ): Promise<CanonicalDeliveryStatus> {
      const uazapiConfig = extractUazapiConfig(config);
      const url = `https://${uazapiConfig.subdomain}.uazapi.com/send/text`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${uazapiConfig.apiToken}`,
        },
        body: JSON.stringify({
          phone: message.to,
          message: message.text,
        }),
      });

      const responseBody = (await response.json()) as Record<string, unknown>;
      const sentId =
        typeof responseBody.messageId === "string"
          ? responseBody.messageId
          : `uazapi-${Date.now()}`;

      return {
        messageId: createWhatsAppMessageId(sentId),
        status: response.ok ? "sent" : "failed",
        timestamp: Date.now(),
      };
    },
  };
}

/** Cria bundle completo (sender + normalizer + verifier + connection) para Uazapi. */
export function createUazapiAdapter() {
  return {
    sender: createUazapiSender(),
    normalizer: createUazapiNormalizer(),
    verifier: createUazapiVerifier(),
    connection: createUazapiConnectionAdapter(),
  };
}
