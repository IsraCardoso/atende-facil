/** Servico de sincronizacao session.mode <-> conversation.status. Ponto unico de atualizacao (RN-026). */
import type { ConversationId, ConversationStatus } from "../../domain/conversation-types";
import type { ConversationRepositoryPort } from "../../domain/ports/conversation-ports";
import type { SessionRepositoryPort } from "../../domain/ports/whatsapp-ports";
import type { SessionId, SessionMode } from "../../domain/whatsapp-types";

type SyncInput = Readonly<{
  tenantId: string;
  sessionId: SessionId;
  conversationId: ConversationId;
  newMode: SessionMode;
  assignedTo?: string | null;
}>;

type ConversationSessionSyncService = Readonly<{
  syncModeAndStatus: (input: SyncInput) => Promise<void>;
}>;

type SyncServiceDeps = Readonly<{
  sessionRepository: SessionRepositoryPort;
  conversationRepository: ConversationRepositoryPort;
}>;

/** Atualiza session.mode e conversation.status em sequencia garantida. */
export function createConversationSessionSyncService(
  deps: SyncServiceDeps,
): ConversationSessionSyncService {
  return {
    async syncModeAndStatus(input: SyncInput): Promise<void> {
      const { tenantId, sessionId, conversationId, newMode, assignedTo } = input;

      const status: ConversationStatus = newMode;

      await deps.sessionRepository.updateMode(tenantId, sessionId, newMode);
      await deps.conversationRepository.updateStatus(tenantId, conversationId, status, assignedTo);
    },
  };
}

export type { ConversationSessionSyncService, SyncInput };
