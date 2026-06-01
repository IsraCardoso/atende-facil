/** Sincroniza mudança de status do Chatwoot → use cases de transição internos (RN-016). Orquestrador sem lógica de transição própria. */
import type { AppLoggerPort } from "../../domain/ports/auth-ports";
import type { ConversationRepositoryPort } from "../../domain/ports/conversation-ports";
import type { ChatwootConversationId, Phone } from "../../domain/whatsapp-types";
import { resolveConversationFromChatwootWebhook } from "../services/resolve-conversation-from-chatwoot-webhook";
import type { createAssignConversationUseCase } from "./assign-conversation-use-case";
import type { createCloseConversationUseCase } from "./close-conversation-use-case";

type ChatwootEventType = "conversation_assigned" | "conversation_resolved";

type SyncChatwootStatusDependencies = Readonly<{
  conversationRepository: ConversationRepositoryPort;
  assignConversation: ReturnType<typeof createAssignConversationUseCase>;
  closeConversation: ReturnType<typeof createCloseConversationUseCase>;
  logger: AppLoggerPort;
}>;

type SyncChatwootStatusInput = Readonly<{
  chatwootConversationId: ChatwootConversationId;
  eventType: ChatwootEventType;
  assignedAgentName: string | null;
  correlationId: string;
  tenantId?: string;
  contactPhone?: Phone;
}>;

type SyncChatwootStatusResult =
  | Readonly<{ success: true }>
  | Readonly<{ success: false; reason: string }>;

export function createSyncChatwootStatusUseCase(deps: SyncChatwootStatusDependencies) {
  return {
    async execute(input: SyncChatwootStatusInput): Promise<SyncChatwootStatusResult> {
      const {
        chatwootConversationId,
        eventType,
        assignedAgentName,
        correlationId,
        tenantId,
        contactPhone,
      } = input;

      const conversation = await resolveConversationFromChatwootWebhook({
        conversationRepository: deps.conversationRepository,
        chatwootConversationId,
        tenantId,
        contactPhone,
      });
      if (!conversation) {
        deps.logger.warn("Webhook Chatwoot status: conversa não encontrada.", {
          correlationId,
          tenantId: "" as string & { readonly __brand: "TenantId" },
          context: { chatwootConversationId },
        });
        return { success: true };
      }

      switch (eventType) {
        case "conversation_assigned": {
          const assignResult = await deps.assignConversation.execute({
            tenantId: conversation.tenantId,
            conversationId: conversation.id,
            assignedTo: assignedAgentName,
            correlationId,
          });
          if (!assignResult.success) {
            deps.logger.warn("Falha ao atribuir conversa via Chatwoot.", {
              correlationId,
              tenantId: conversation.tenantId as string & { readonly __brand: "TenantId" },
              context: { error: assignResult.error.message },
            });
          }
          return { success: true };
        }
        case "conversation_resolved": {
          const closeResult = await deps.closeConversation.execute({
            tenantId: conversation.tenantId,
            conversationId: conversation.id,
            correlationId,
          });
          if (!closeResult.success) {
            deps.logger.warn("Falha ao encerrar conversa via Chatwoot.", {
              correlationId,
              tenantId: conversation.tenantId as string & { readonly __brand: "TenantId" },
              context: { error: closeResult.error.message },
            });
          }
          return { success: true };
        }
        default: {
          const Exhaustive: never = eventType;
          return Exhaustive;
        }
      }
    },
  };
}

export type {
  ChatwootEventType,
  SyncChatwootStatusDependencies,
  SyncChatwootStatusInput,
  SyncChatwootStatusResult,
};
