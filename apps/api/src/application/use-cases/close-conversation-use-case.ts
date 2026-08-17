/** Encerra atendimento humano. Transição waiting_human|human_active → bot com reinício de sessão (RN-014, decisão D7). */
import type {
  ConversationEntity,
  ConversationId,
  ConversationStatus,
} from "../../domain/conversation-types";
import { isValidTransition } from "../../domain/conversation-types";
import type { AppLoggerPort } from "../../domain/ports/auth-ports";
import type {
  ConversationRepositoryPort,
  DomainEventPublisherPort,
} from "../../domain/ports/conversation-ports";
import type { SessionRepositoryPort } from "../../domain/ports/whatsapp-ports";
import { createAppError } from "../errors/app-error";

type CloseConversationDependencies = Readonly<{
  conversationRepository: ConversationRepositoryPort;
  sessionRepository: SessionRepositoryPort;
  eventPublisher: DomainEventPublisherPort;
  logger: AppLoggerPort;
}>;

type CloseConversationInput = Readonly<{
  tenantId: string;
  conversationId: ConversationId;
  correlationId: string;
}>;

type CloseConversationResult =
  | Readonly<{ success: true; conversation: ConversationEntity }>
  | Readonly<{ success: false; error: ReturnType<typeof createAppError> }>;

export function createCloseConversationUseCase(deps: CloseConversationDependencies) {
  return {
    async execute(input: CloseConversationInput): Promise<CloseConversationResult> {
      const { tenantId, conversationId, correlationId } = input;

      const conversation = await deps.conversationRepository.findById(tenantId, conversationId);
      if (!conversation) {
        return {
          success: false,
          error: createAppError("CONVERSATION_NOT_FOUND", "Conversa não encontrada."),
        };
      }

      if (!isValidTransition(conversation.status, "bot")) {
        return {
          success: false,
          error: createAppError(
            "CONVERSATION_INVALID_TRANSITION",
            `Transição de estado inválida: ${conversation.status} → bot`,
          ),
        };
      }

      const previousStatus = conversation.status as Exclude<ConversationStatus, "bot">;

      await deps.conversationRepository.updateStatus(tenantId, conversationId, "bot", null);

      const session = await deps.sessionRepository.findByTenantAndPhone(
        tenantId,
        conversation.phone,
      );

      if (session) {
        const resetSession = {
          ...session,
          currentNodeId: null,
          mode: "bot" as const,
          data: {},
          flowId: null,
          updatedAt: new Date(),
        };
        await deps.sessionRepository.save(resetSession);
      }

      const updated: ConversationEntity = {
        ...conversation,
        status: "bot",
        assignedTo: null,
        updatedAt: new Date(),
      };

      await deps.eventPublisher.publish({
        type: "conversation.bot_resumed",
        tenantId,
        conversationId,
        phone: conversation.phone,
        timestamp: Date.now(),
        payload: {
          sessionId: conversation.sessionId,
          previousStatus,
        },
      });

      deps.logger.info("Atendimento humano encerrado, sessão reiniciada.", {
        correlationId,
        tenantId: tenantId as string & { readonly __brand: "TenantId" },
      });

      return { success: true, conversation: updated };
    },
  };
}

export type { CloseConversationDependencies, CloseConversationInput, CloseConversationResult };
