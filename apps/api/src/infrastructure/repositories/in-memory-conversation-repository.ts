/** Repositório in-memory para conversations. Usado em dev/test; produção usará Drizzle. */
import type {
  ConversationEntity,
  ConversationId,
  ConversationStatus,
} from "../../domain/conversation-types";
import type {
  ConversationFilters,
  ConversationRepositoryPort,
  PaginatedResult,
} from "../../domain/ports/conversation-ports";
import type { ChatwootConversationId, SessionId } from "../../domain/whatsapp-types";

type InMemoryConversationRepositoryExtras = ConversationRepositoryPort &
  Readonly<{
    getAll: () => readonly ConversationEntity[];
    clear: () => void;
  }>;

export function createInMemoryConversationRepository(): InMemoryConversationRepositoryExtras {
  const store = new Map<ConversationId, ConversationEntity>();

  return {
    async findById(
      tenantId: string,
      conversationId: ConversationId,
    ): Promise<ConversationEntity | null> {
      const conversation = store.get(conversationId);
      if (!conversation || conversation.tenantId !== tenantId) {
        return null;
      }
      return conversation;
    },

    async findBySessionId(
      tenantId: string,
      sessionId: SessionId,
    ): Promise<ConversationEntity | null> {
      for (const conversation of store.values()) {
        if (conversation.tenantId === tenantId && conversation.sessionId === sessionId) {
          return conversation;
        }
      }
      return null;
    },

    async findByChatwootConversationId(
      chatwootConversationId: ChatwootConversationId,
    ): Promise<ConversationEntity | null> {
      for (const conversation of store.values()) {
        if (conversation.chatwootConversationId === chatwootConversationId) {
          return conversation;
        }
      }
      return null;
    },

    async findByTenantAndStatus(
      tenantId: string,
      status: ConversationStatus,
    ): Promise<readonly ConversationEntity[]> {
      const results: ConversationEntity[] = [];
      for (const conversation of store.values()) {
        if (conversation.tenantId === tenantId && conversation.status === status) {
          results.push(conversation);
        }
      }
      return results;
    },

    async findByTenantPaginated(
      tenantId: string,
      filters: ConversationFilters,
    ): Promise<PaginatedResult<ConversationEntity>> {
      const all: ConversationEntity[] = [];
      for (const conversation of store.values()) {
        if (conversation.tenantId !== tenantId) {
          continue;
        }
        if (filters.status && conversation.status !== filters.status) {
          continue;
        }
        all.push(conversation);
      }
      all.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      const total = all.length;
      const offset = (filters.page - 1) * filters.limit;
      const data = all.slice(offset, offset + filters.limit);

      return {
        data,
        total,
        page: filters.page,
        limit: filters.limit,
        hasMore: offset + filters.limit < total,
      };
    },

    async save(conversation: ConversationEntity): Promise<ConversationEntity> {
      store.set(conversation.id, conversation);
      return conversation;
    },

    async updateStatus(
      tenantId: string,
      conversationId: ConversationId,
      status: ConversationStatus,
      assignedTo?: string | null,
    ): Promise<void> {
      const existing = store.get(conversationId);
      if (!existing || existing.tenantId !== tenantId) {
        return;
      }

      store.set(conversationId, {
        ...existing,
        status,
        ...(assignedTo !== undefined ? { assignedTo } : {}),
        updatedAt: new Date(),
      });
    },

    getAll(): readonly ConversationEntity[] {
      return [...store.values()];
    },

    clear(): void {
      store.clear();
    },
  };
}

export type { InMemoryConversationRepositoryExtras };
