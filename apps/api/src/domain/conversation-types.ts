/** Tipos de domínio para Conversation. Entidade que tracka o ciclo de atendimento humano, separada de Session (RN-014). */
import type { ChatwootConversationId, Phone, SessionId } from "./whatsapp-types";

type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

type ConversationId = Brand<string, "ConversationId">;

type ConversationStatus = "bot" | "waiting_human" | "human_active";

/** Conversation tracka ciclo de atendimento. Session tracka estado do bot/flow. Separação de responsabilidades (RN-014). */
type ConversationEntity = Readonly<{
  id: ConversationId;
  tenantId: string;
  sessionId: SessionId;
  phone: Phone;
  status: ConversationStatus;
  assignedTo: string | null;
  chatwootConversationId: ChatwootConversationId | null;
  createdAt: Date;
  updatedAt: Date;
}>;

type DomainEventType =
  | "conversation.handed_off"
  | "conversation.human_active"
  | "conversation.bot_resumed";

type BaseDomainEvent<TType extends DomainEventType, TPayload> = Readonly<{
  type: TType;
  tenantId: string;
  conversationId: ConversationId;
  phone: Phone;
  timestamp: number;
  payload: TPayload;
}>;

type ConversationHandedOffEvent = BaseDomainEvent<
  "conversation.handed_off",
  Readonly<{
    sessionId: SessionId;
    chatwootConversationId: ChatwootConversationId | null;
    reason: string | null;
  }>
>;

type ConversationHumanActiveEvent = BaseDomainEvent<
  "conversation.human_active",
  Readonly<{
    sessionId: SessionId;
    assignedTo: string | null;
  }>
>;

type ConversationBotResumedEvent = BaseDomainEvent<
  "conversation.bot_resumed",
  Readonly<{
    sessionId: SessionId;
    previousStatus: Exclude<ConversationStatus, "bot">;
  }>
>;

/** Union discriminada de todos os eventos de domínio. Switch exaustivo por `type`. */
type DomainEvent =
  | ConversationHandedOffEvent
  | ConversationHumanActiveEvent
  | ConversationBotResumedEvent;

const VALID_TRANSITIONS: ReadonlyMap<ConversationStatus, readonly ConversationStatus[]> = new Map([
  ["bot", ["waiting_human"]],
  ["waiting_human", ["human_active", "bot"]],
  ["human_active", ["bot"]],
]);

function isValidTransition(from: ConversationStatus, to: ConversationStatus): boolean {
  const allowed = VALID_TRANSITIONS.get(from);
  return allowed !== undefined && allowed.includes(to);
}

/**
 * Constrói um ConversationId branded.
 * @throws {Error} Quando o valor fica vazio após trim.
 */
function createConversationId(rawValue: string): ConversationId {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    throw new Error("ConversationId invalido: valor vazio.");
  }

  return trimmed as ConversationId;
}

export type {
  ConversationBotResumedEvent,
  ConversationEntity,
  ConversationHandedOffEvent,
  ConversationHumanActiveEvent,
  ConversationId,
  ConversationStatus,
  DomainEvent,
  DomainEventType,
};
export { createConversationId, isValidTransition, VALID_TRANSITIONS };
