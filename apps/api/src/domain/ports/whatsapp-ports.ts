import type {
  CanonicalDeliveryStatus,
  CanonicalInboundMessage,
  CanonicalOutboundMessage,
  ChatwootConversationId,
  Phone,
  SessionEntity,
  SessionId,
  SessionMode,
  WhatsAppInstanceConfig,
  WhatsAppInstanceEntity,
  WhatsAppInstanceId,
  WhatsAppMessageId,
  WhatsAppProvider,
} from "../whatsapp-types";

/** Port de persistência de sessões. Unique constraint em (tenant_id, phone) garante uma sessão por contato. */
type SessionRepositoryPort = Readonly<{
  findByTenantAndPhone: (tenantId: string, phone: Phone) => Promise<SessionEntity | null>;
  save: (session: SessionEntity) => Promise<SessionEntity>;
  updateMode: (
    tenantId: string,
    sessionId: SessionId,
    mode: SessionMode,
    chatwootConversationId?: ChatwootConversationId,
  ) => Promise<void>;
}>;

/** Port de consulta de instâncias WhatsApp. Resolve qual provider usar para cada tenant. */
type WhatsAppInstanceRepositoryPort = Readonly<{
  findByTenantAndId: (
    tenantId: string,
    instanceId: WhatsAppInstanceId,
  ) => Promise<WhatsAppInstanceEntity | null>;
  findActiveByTenant: (tenantId: string) => Promise<readonly WhatsAppInstanceEntity[]>;
}>;

/** Lock distribuído para serializar processamento de mensagens do mesmo contato. TTL de 10s previne deadlock (RN-012). */
type SessionLockPort = Readonly<{
  acquire: (tenantId: string, phone: Phone, ttlMs: number) => Promise<boolean>;
  release: (tenantId: string, phone: Phone) => Promise<void>;
}>;

/** Idempotência de webhooks por (provider, messageId). TTL de 24h cobre retries de todos os providers (RN-012). */
type WebhookIdempotencyPort = Readonly<{
  isProcessed: (provider: WhatsAppProvider, messageId: WhatsAppMessageId) => Promise<boolean>;
  markProcessed: (
    provider: WhatsAppProvider,
    messageId: WhatsAppMessageId,
    ttlSeconds: number,
  ) => Promise<void>;
}>;

/** Port de envio de mensagens. Cada provider implementa sua própria chamada HTTP. */
type WhatsAppSenderPort = Readonly<{
  sendText: (
    config: WhatsAppInstanceConfig,
    message: CanonicalOutboundMessage,
  ) => Promise<CanonicalDeliveryStatus>;
}>;

/** Normaliza payload bruto do provider para CanonicalInboundMessage. Retorna null se payload não for uma mensagem de texto válida. */
type InboundNormalizer = Readonly<{
  normalize: (rawPayload: unknown) => CanonicalInboundMessage | null;
}>;

type WebhookVerificationInput = Readonly<{
  headers: Readonly<Record<string, string | undefined>>;
  query: Readonly<Record<string, string | undefined>>;
  body: unknown;
  instanceConfig: WhatsAppInstanceConfig;
}>;

type WebhookVerificationResult =
  | Readonly<{ valid: true }>
  | Readonly<{ valid: false; reason: string }>;

/** Verifica autenticidade do webhook (apikey, token, assinatura). Cada provider tem seu mecanismo. */
type WebhookVerifier = Readonly<{
  verify: (input: WebhookVerificationInput) => WebhookVerificationResult;
}>;

type MetaChallengeInput = Readonly<{
  mode: string | undefined;
  verifyToken: string | undefined;
  challenge: string | undefined;
  expectedVerifyToken: string;
}>;

type MetaChallengeResult =
  | Readonly<{ valid: true; challenge: string }>
  | Readonly<{ valid: false }>;

/** Conjunto completo de capacidades de um provider. Resolvido via ProviderFactory com switch exaustivo. */
type ProviderBundle = Readonly<{
  sender: WhatsAppSenderPort;
  normalizer: InboundNormalizer;
  verifier: WebhookVerifier;
}>;

/** Port de integração com Chatwoot para hand-off humano. Desacoplado via adapter (RN-013). */
type ChatwootPort = Readonly<{
  createConversation: (input: ChatwootCreateConversationInput) => Promise<ChatwootConversationId>;
  sendMessage: (input: ChatwootSendMessageInput) => Promise<void>;
  findConversationBySessionId: (sessionId: SessionId) => Promise<ChatwootConversationId | null>;
}>;

type ChatwootCreateConversationInput = Readonly<{
  tenantId: string;
  phone: Phone;
  sessionId: SessionId;
  contextMessages: readonly string[];
}>;

type ChatwootSendMessageInput = Readonly<{
  conversationId: ChatwootConversationId;
  message: string;
}>;

/** Port para buscar o fluxo conversacional ativo de um tenant. */
type FlowRepositoryPort = Readonly<{
  findActiveByTenant: (tenantId: string) => Promise<FlowDefinitionRecord | null>;
}>;

type FlowDefinitionRecord = Readonly<{
  id: string;
  tenantId: string;
  definition: Readonly<Record<string, unknown>>;
}>;

export type {
  ChatwootCreateConversationInput,
  ChatwootPort,
  ChatwootSendMessageInput,
  FlowDefinitionRecord,
  FlowRepositoryPort,
  InboundNormalizer,
  MetaChallengeInput,
  MetaChallengeResult,
  ProviderBundle,
  SessionLockPort,
  SessionRepositoryPort,
  WebhookIdempotencyPort,
  WebhookVerificationInput,
  WebhookVerificationResult,
  WebhookVerifier,
  WhatsAppInstanceRepositoryPort,
  WhatsAppSenderPort,
};
