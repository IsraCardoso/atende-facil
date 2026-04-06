/** Adapters de idempotência de webhook. Previne processamento duplicado do mesmo evento (RN-012). */
import type { CachePort } from "../../domain/ports/auth-ports";
import type { WebhookIdempotencyPort } from "../../domain/ports/whatsapp-ports";
import type { WhatsAppMessageId, WhatsAppProvider } from "../../domain/whatsapp-types";

const IDEMPOTENCY_NAMESPACE = "webhook-idem";
const DEFAULT_TTL_SECONDS = 86400;

function createIdempotencyKey(provider: WhatsAppProvider, messageId: WhatsAppMessageId): string {
  return `${IDEMPOTENCY_NAMESPACE}:${provider}:${messageId}`;
}

/** Idempotência via Valkey (CachePort). TTL padrão de 24h. */
export function createValkeyWebhookIdempotencyAdapter(
  cachePort: CachePort,
): WebhookIdempotencyPort {
  return {
    async isProcessed(provider: WhatsAppProvider, messageId: WhatsAppMessageId): Promise<boolean> {
      const key = createIdempotencyKey(provider, messageId);
      const existing = await cachePort.get<string>(key);
      return existing !== null;
    },

    async markProcessed(
      provider: WhatsAppProvider,
      messageId: WhatsAppMessageId,
      ttlSeconds: number = DEFAULT_TTL_SECONDS,
    ): Promise<void> {
      const key = createIdempotencyKey(provider, messageId);
      await cachePort.set({ key, value: "1", ttlSeconds });
    },
  };
}

/** Idempotência in-memory para dev/test. Sem expiração (Set simples). */
export function createInMemoryWebhookIdempotencyAdapter(): WebhookIdempotencyPort {
  const processed = new Set<string>();

  return {
    async isProcessed(provider: WhatsAppProvider, messageId: WhatsAppMessageId): Promise<boolean> {
      return processed.has(createIdempotencyKey(provider, messageId));
    },

    async markProcessed(
      provider: WhatsAppProvider,
      messageId: WhatsAppMessageId,
      _ttlSeconds: number = DEFAULT_TTL_SECONDS,
    ): Promise<void> {
      processed.add(createIdempotencyKey(provider, messageId));
    },
  };
}
