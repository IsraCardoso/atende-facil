/** Ports de domínio para Conversation e eventos. Contratos consumidos por use cases — implementações na infrastructure. */
import type {
  ConversationEntity,
  ConversationId,
  ConversationStatus,
  DomainEvent,
  DomainEventType,
} from "../conversation-types";
import type { ChatwootConversationId, SessionId } from "../whatsapp-types";

/** Resultado paginado genérico reutilizável em qualquer listagem. */
type PaginatedResult<T> = Readonly<{
  data: readonly T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}>;

/** Filtros aceitos na listagem paginada de conversations. */
type ConversationFilters = Readonly<{
  status?: ConversationStatus;
  page: number;
  limit: number;
}>;

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
  findByTenantPaginated: (
    tenantId: string,
    filters: ConversationFilters,
  ) => Promise<PaginatedResult<ConversationEntity>>;
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

export type {
  ConversationFilters,
  ConversationRepositoryPort,
  DomainEventPublisherPort,
  DomainEventSubscriberPort,
  PaginatedResult,
};
