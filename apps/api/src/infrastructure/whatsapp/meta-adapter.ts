/** Adapter Meta Cloud API (WhatsApp Business). Suporta challenge verification, normalização de webhooks e envio via Graph API. */
import type {
  InboundNormalizer,
  MetaChallengeInput,
  MetaChallengeResult,
  WebhookVerificationInput,
  WebhookVerificationResult,
  WebhookVerifier,
  WhatsAppSenderPort,
} from "../../domain/ports/whatsapp-ports";
import type {
  CanonicalDeliveryStatus,
  CanonicalInboundMessage,
  CanonicalOutboundMessage,
  MetaInstanceConfig,
  WhatsAppInstanceConfig,
} from "../../domain/whatsapp-types";
import { createPhone, createWhatsAppMessageId } from "../../domain/whatsapp-types";
import { createMetaConnectionAdapter } from "./whatsapp-connection-stubs";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function extractMetaConfig(config: WhatsAppInstanceConfig): MetaInstanceConfig {
  if (config.provider !== "meta") {
    throw new Error("Config inválida: provider não é meta.");
  }
  return config.config;
}

function extractFirstMessage(
  rawPayload: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | null {
  const entry = Array.isArray(rawPayload.entry) ? rawPayload.entry : null;
  if (!entry || entry.length === 0) {
    return null;
  }

  const firstEntry = isRecord(entry[0]) ? entry[0] : null;
  if (!firstEntry) {
    return null;
  }

  const changes = Array.isArray(firstEntry.changes) ? firstEntry.changes : null;
  if (!changes || changes.length === 0) {
    return null;
  }

  const firstChange = isRecord(changes[0]) ? changes[0] : null;
  if (!firstChange) {
    return null;
  }

  const value = isRecord(firstChange.value) ? firstChange.value : null;
  if (!value) {
    return null;
  }

  const messages = Array.isArray(value.messages) ? value.messages : null;
  if (!messages || messages.length === 0) {
    return null;
  }

  return isRecord(messages[0]) ? messages[0] : null;
}

function resolveMetaTimestamp(msg: Readonly<Record<string, unknown>>): number {
  if (typeof msg.timestamp === "string") {
    return Number.parseInt(msg.timestamp, 10);
  }

  if (typeof msg.timestamp === "number") {
    return msg.timestamp;
  }

  return Date.now();
}

function createMetaNormalizer(): InboundNormalizer {
  return {
    normalize(rawPayload: unknown): CanonicalInboundMessage | null {
      if (!isRecord(rawPayload)) {
        return null;
      }

      const msg = extractFirstMessage(rawPayload);
      if (!msg) {
        return null;
      }

      const messageId = typeof msg.id === "string" ? msg.id : null;
      const from = typeof msg.from === "string" ? msg.from : null;
      const timestamp = resolveMetaTimestamp(msg);
      const textObj = isRecord(msg.text) ? msg.text : null;
      const text = typeof textObj?.body === "string" ? textObj.body : null;

      if (!messageId || !from || !text) {
        return null;
      }

      return {
        messageId: createWhatsAppMessageId(messageId),
        from: createPhone(from),
        text,
        timestamp,
        provider: "meta",
        rawPayload: rawPayload as Readonly<Record<string, unknown>>,
      };
    },
  };
}

function createMetaVerifier(): WebhookVerifier {
  return {
    verify(input: WebhookVerificationInput): WebhookVerificationResult {
      const config = extractMetaConfig(input.instanceConfig);
      const authHeader = input.headers.authorization ?? input.headers.Authorization;

      if (!authHeader) {
        return { valid: false, reason: "Header Authorization ausente." };
      }

      const expectedPrefix = `Bearer ${config.accessToken}`;
      if (authHeader !== expectedPrefix) {
        return { valid: false, reason: "Token Bearer inválido." };
      }

      return { valid: true };
    },
  };
}

function createMetaSender(): WhatsAppSenderPort {
  return {
    async sendText(
      config: WhatsAppInstanceConfig,
      message: CanonicalOutboundMessage,
    ): Promise<CanonicalDeliveryStatus> {
      const metaConfig = extractMetaConfig(config);
      const version = metaConfig.apiVersion || "v18.0";
      const url = `https://graph.facebook.com/${version}/${metaConfig.phoneNumberId}/messages`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${metaConfig.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.to,
          type: "text",
          text: { body: message.text },
        }),
      });

      const responseBody = (await response.json()) as Record<string, unknown>;
      const messagesArr = Array.isArray(responseBody.messages) ? responseBody.messages : [];
      const firstMsg = isRecord(messagesArr[0]) ? messagesArr[0] : null;
      const sentId = typeof firstMsg?.id === "string" ? firstMsg.id : `meta-${Date.now()}`;

      return {
        messageId: createWhatsAppMessageId(sentId),
        status: response.ok ? "sent" : "failed",
        timestamp: Date.now(),
      };
    },
  };
}

/** Resolve o desafio de verificação do webhook da Meta (hub.mode=subscribe). */
export function resolveMetaChallenge(input: MetaChallengeInput): MetaChallengeResult {
  if (input.mode !== "subscribe") {
    return { valid: false };
  }

  if (input.verifyToken !== input.expectedVerifyToken) {
    return { valid: false };
  }

  if (!input.challenge) {
    return { valid: false };
  }

  return { valid: true, challenge: input.challenge };
}

/** Cria bundle completo (sender + normalizer + verifier) para Meta Cloud API. */
export function createMetaAdapter() {
  return {
    sender: createMetaSender(),
    normalizer: createMetaNormalizer(),
    verifier: createMetaVerifier(),
    connection: createMetaConnectionAdapter(),
  };
}
