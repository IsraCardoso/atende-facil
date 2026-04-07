/** Ports de domínio para Conversation e eventos. Contratos consumidos por use cases — implementações na infrastructure. */
import type {
  ConversationEntity,
  ConversationId,
  ConversationStatus,
  DomainEvent,
  DomainEventType,
} from "../conversation-types";
import type { ChatwootConversationId, SessionId } from "../whatsapp-types";

/** Persistência de conversations. Isolamento por tenant_id obrigatório em todas as queries. */
type ConversationRepositoryPort = Readonly<{
  findById: (
    tenantId: string,
    conversationId: ConversationId,
  ) => Promise<ConversationEntity | null>;
  findBySessionId: (tenantId: string, sessionId: SessionId) => Promise<ConversationEntity | null>;
  findByChatwootConversationId: (
    chatwootConversationId: ChatwootConversationId,
  ) => Promise<ConversationEntity | null>;
  findByTenantAndStatus: (
    tenantId: string,
    status: ConversationStatus,
  ) => Promise<readonly ConversationEntity[]>;
  save: (conversation: ConversationEntity) => Promise<ConversationEntity>;
  updateStatus: (
    tenantId: string,
    conversationId: ConversationId,
    status: ConversationStatus,
    assignedTo?: string | null,
  ) => Promise<void>;
}>;

/** Publica eventos de domínio via Valkey Pub/Sub após persistência bem-sucedida (RN-015). */
type DomainEventPublisherPort = Readonly<{
  publish: (event: DomainEvent) => Promise<void>;
}>;

/** Consome eventos de domínio via Valkey Pub/Sub. Handlers registrados por tipo de evento. */
type DomainEventSubscriberPort = Readonly<{
  subscribe: (eventType: DomainEventType, handler: (event: DomainEvent) => void) => void;
  unsubscribeAll: () => void;
}>;

export type { ConversationRepositoryPort, DomainEventPublisherPort, DomainEventSubscriberPort };
