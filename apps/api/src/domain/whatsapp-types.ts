/** Tipos de domínio para mensageria WhatsApp. Contratos canônicos que abstraem diferenças entre provedores (RN-011). */
type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

type Phone = Brand<string, "Phone">;
type WhatsAppMessageId = Brand<string, "WhatsAppMessageId">;
type WhatsAppInstanceId = Brand<string, "WhatsAppInstanceId">;
type SessionId = Brand<string, "SessionId">;
type ChatwootConversationId = Brand<string, "ChatwootConversationId">;

type WhatsAppProvider = "evolution" | "zapi" | "uazapi" | "meta";

const acceptedWhatsAppProviders: readonly WhatsAppProvider[] = [
  "evolution",
  "zapi",
  "uazapi",
  "meta",
];

/** Mensagem recebida normalizada. Todo provider converte seu payload para este formato antes de atingir o use case. */
type CanonicalInboundMessage = Readonly<{
  messageId: WhatsAppMessageId;
  from: Phone;
  text: string;
  timestamp: number;
  provider: WhatsAppProvider;
  rawPayload: Readonly<Record<string, unknown>>;
}>;

/** Mensagem a ser enviada. O adapter do provider traduz este formato para a API específica. */
type CanonicalOutboundMessage = Readonly<{
  to: Phone;
  text: string;
  instanceId: WhatsAppInstanceId;
}>;

type DeliveryStatusKind = "sent" | "delivered" | "read" | "failed";

/** Status de entrega retornado pelo provider após envio. */
type CanonicalDeliveryStatus = Readonly<{
  messageId: WhatsAppMessageId;
  status: DeliveryStatusKind;
  timestamp: number;
}>;

type EvolutionInstanceConfig = Readonly<{
  instanceName: string;
  apiUrl: string;
  apiKey: string;
}>;

type ZapiInstanceConfig = Readonly<{
  instanceId: string;
  token: string;
  clientToken: string;
}>;

type UazapiInstanceConfig = Readonly<{
  subdomain: string;
  apiToken: string;
}>;

type MetaInstanceConfig = Readonly<{
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  apiVersion: string;
}>;

/** Union discriminada por provider. Garante type-safety na configuração de cada provedor via switch exaustivo. */
type WhatsAppInstanceConfig =
  | Readonly<{ provider: "evolution"; config: EvolutionInstanceConfig }>
  | Readonly<{ provider: "zapi"; config: ZapiInstanceConfig }>
  | Readonly<{ provider: "uazapi"; config: UazapiInstanceConfig }>
  | Readonly<{ provider: "meta"; config: MetaInstanceConfig }>;

/** Modo da sessão conversacional. Determina se mensagens vão para o flow engine (bot) ou Chatwoot (human). */
type SessionMode = "bot" | "waiting_human" | "human_active";

/** Entidade de sessão conversacional. Unique por (tenant_id, phone). Persiste estado do fluxo e vínculo com Chatwoot. */
type SessionEntity = Readonly<{
  id: SessionId;
  tenantId: string;
  phone: Phone;
  currentNodeId: string | null;
  mode: SessionMode;
  data: Readonly<Record<string, unknown>>;
  flowId: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

/** Instância WhatsApp configurada por tenant. Contém credenciais do provider em config (JSONB). */
type WhatsAppInstanceEntity = Readonly<{
  id: WhatsAppInstanceId;
  tenantId: string;
  provider: WhatsAppProvider;
  config: Readonly<Record<string, unknown>>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>;

/**
 * Constrói um Phone branded a partir de string bruta.
 * @throws {Error} Quando o valor fica vazio após trim.
 */
function createPhone(rawValue: string): Phone {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    throw new Error("Phone invalido: valor vazio.");
  }

  return trimmed as Phone;
}

/**
 * Constrói um WhatsAppMessageId branded.
 * @throws {Error} Quando o valor fica vazio após trim.
 */
function createWhatsAppMessageId(rawValue: string): WhatsAppMessageId {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    throw new Error("WhatsAppMessageId invalido: valor vazio.");
  }

  return trimmed as WhatsAppMessageId;
}

/**
 * Constrói um WhatsAppInstanceId branded.
 * @throws {Error} Quando o valor fica vazio após trim.
 */
function createWhatsAppInstanceId(rawValue: string): WhatsAppInstanceId {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    throw new Error("WhatsAppInstanceId invalido: valor vazio.");
  }

  return trimmed as WhatsAppInstanceId;
}

/**
 * Constrói um SessionId branded.
 * @throws {Error} Quando o valor fica vazio após trim.
 */
function createSessionId(rawValue: string): SessionId {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    throw new Error("SessionId invalido: valor vazio.");
  }

  return trimmed as SessionId;
}

/**
 * Constrói um ChatwootConversationId branded.
 * @throws {Error} Quando o valor fica vazio após trim.
 */
function createChatwootConversationId(rawValue: string): ChatwootConversationId {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    throw new Error("ChatwootConversationId invalido: valor vazio.");
  }

  return trimmed as ChatwootConversationId;
}

/** Type guard para validar se uma string é um provider suportado. */
function isValidWhatsAppProvider(rawValue: string): rawValue is WhatsAppProvider {
  return acceptedWhatsAppProviders.includes(rawValue as WhatsAppProvider);
}

export type {
  CanonicalDeliveryStatus,
  CanonicalInboundMessage,
  CanonicalOutboundMessage,
  ChatwootConversationId,
  DeliveryStatusKind,
  EvolutionInstanceConfig,
  MetaInstanceConfig,
  Phone,
  SessionEntity,
  SessionId,
  SessionMode,
  UazapiInstanceConfig,
  WhatsAppInstanceConfig,
  WhatsAppInstanceEntity,
  WhatsAppInstanceId,
  WhatsAppMessageId,
  WhatsAppProvider,
  ZapiInstanceConfig,
};
export {
  acceptedWhatsAppProviders,
  createChatwootConversationId,
  createPhone,
  createSessionId,
  createWhatsAppInstanceId,
  createWhatsAppMessageId,
  isValidWhatsAppProvider,
};
