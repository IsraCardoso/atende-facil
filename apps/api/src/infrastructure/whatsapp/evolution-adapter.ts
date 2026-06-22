/** Adapter Evolution API v2. Normaliza webhooks, verifica apikey header e envia mensagens via REST. */
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
  EvolutionInstanceConfig,
  WhatsAppInstanceConfig,
} from "../../domain/whatsapp-types";
import { createPhone, createWhatsAppMessageId } from "../../domain/whatsapp-types";
import { createEvolutionConnectionAdapter } from "./evolution-connection-adapter";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function extractEvolutionConfig(config: WhatsAppInstanceConfig): EvolutionInstanceConfig {
  if (config.provider !== "evolution") {
    throw new Error("Config inválida: provider não é evolution.");
  }
  return config.config;
}

function extractTextFromMessage(message: Readonly<Record<string, unknown>> | null): string | null {
  if (!message) {
    return null;
  }

  if (typeof message.conversation === "string") {
    return message.conversation;
  }

  if (isRecord(message.extendedTextMessage)) {
    const extText = message.extendedTextMessage;
    if (typeof extText.text === "string") {
      return extText.text;
    }
  }

  return null;
}

function resolveTimestamp(data: Readonly<Record<string, unknown>>): number {
  if (typeof data.messageTimestamp === "number") {
    return data.messageTimestamp;
  }

  if (typeof data.messageTimestamp === "string") {
    return Number.parseInt(data.messageTimestamp, 10);
  }

  return Date.now();
}

function resolveReceivedApiKey(input: WebhookVerificationInput): string | null {
  const fromHeader = input.headers.apikey ?? input.headers.Apikey ?? input.headers.APIKEY;
  if (typeof fromHeader === "string" && fromHeader.length > 0) {
    return fromHeader;
  }

  if (
    isRecord(input.body) &&
    typeof input.body.apikey === "string" &&
    input.body.apikey.length > 0
  ) {
    return input.body.apikey;
  }

  return null;
}

function createEvolutionNormalizer(): InboundNormalizer {
  return {
    normalize(rawPayload: unknown): CanonicalInboundMessage | null {
      if (!isRecord(rawPayload)) {
        return null;
      }

      const data = isRecord(rawPayload.data) ? rawPayload.data : null;
      if (!data) {
        return null;
      }

      const key = isRecord(data.key) ? data.key : null;
      if (key?.fromMe === true) {
        return null;
      }

      const remoteJid = typeof key?.remoteJid === "string" ? key.remoteJid : null;
      const messageId = typeof key?.id === "string" ? key.id : null;
      const message = isRecord(data.message) ? data.message : null;
      const text = extractTextFromMessage(message);
      const timestamp = resolveTimestamp(data);

      if (!remoteJid || !messageId || !text) {
        return null;
      }

      const phone = remoteJid.replace(/@s\.whatsapp\.net$/, "");

      return {
        messageId: createWhatsAppMessageId(messageId),
        from: createPhone(phone),
        text,
        timestamp,
        provider: "evolution",
        rawPayload: rawPayload as Readonly<Record<string, unknown>>,
      };
    },
  };
}

function createEvolutionVerifier(): WebhookVerifier {
  return {
    verify(input: WebhookVerificationInput): WebhookVerificationResult {
      const config = extractEvolutionConfig(input.instanceConfig);
      const receivedApiKey = resolveReceivedApiKey(input);

      if (!receivedApiKey || receivedApiKey !== config.apiKey) {
        return { valid: false, reason: "Header ou body apikey ausente ou inválido." };
      }

      return { valid: true };
    },
  };
}

function createEvolutionSender(): WhatsAppSenderPort {
  return {
    async sendText(
      config: WhatsAppInstanceConfig,
      message: CanonicalOutboundMessage,
    ): Promise<CanonicalDeliveryStatus> {
      const evoConfig = extractEvolutionConfig(config);
      const url = `${evoConfig.apiUrl}/message/sendText/${evoConfig.instanceName}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: evoConfig.apiKey,
        },
        body: JSON.stringify({
          number: message.to,
          text: message.text,
        }),
      });

      const responseBody = (await response.json()) as Record<string, unknown>;
      const keyObj = isRecord(responseBody.key) ? responseBody.key : null;
      const sentMessageId = typeof keyObj?.id === "string" ? keyObj.id : `evo-${Date.now()}`;

      return {
        messageId: createWhatsAppMessageId(sentMessageId),
        status: response.ok ? "sent" : "failed",
        timestamp: Date.now(),
      };
    },
  };
}

/** Cria bundle completo (sender + normalizer + verifier + connection) para Evolution API. */
export function createEvolutionAdapter() {
  return {
    sender: createEvolutionSender(),
    normalizer: createEvolutionNormalizer(),
    verifier: createEvolutionVerifier(),
    connection: createEvolutionConnectionAdapter(),
  };
}
