/** Atribui conversa a um agente humano. Transição waiting_human → human_active com evento (RN-014). */
import type { ConversationEntity, ConversationId } from "../../domain/conversation-types";
import { isValidTransition } from "../../domain/conversation-types";
import type { AppLoggerPort } from "../../domain/ports/auth-ports";
import type {
  ConversationRepositoryPort,
  DomainEventPublisherPort,
} from "../../domain/ports/conversation-ports";
import type { SessionRepositoryPort } from "../../domain/ports/whatsapp-ports";
import { createAppError } from "../errors/app-error";

type AssignConversationDependencies = Readonly<{
  conversationRepository: ConversationRepositoryPort;
  sessionRepository: SessionRepositoryPort;
  eventPublisher: DomainEventPublisherPort;
  logger: AppLoggerPort;
}>;

type AssignConversationInput = Readonly<{
  tenantId: string;
  conversationId: ConversationId;
  assignedTo: string | null;
  correlationId: string;
}>;

type AssignConversationResult =
  | Readonly<{ success: true; conversation: ConversationEntity }>
  | Readonly<{ success: false; error: ReturnType<typeof createAppError> }>;

export function createAssignConversationUseCase(deps: AssignConversationDependencies) {
  return {
    async execute(input: AssignConversationInput): Promise<AssignConversationResult> {
      const { tenantId, conversationId, assignedTo, correlationId } = input;

      const conversation = await deps.conversationRepository.findById(tenantId, conversationId);
      if (!conversation) {
        return {
          success: false,
          error: createAppError("CONVERSATION_NOT_FOUND", "Conversa não encontrada."),
        };
      }

      if (!isValidTransition(conversation.status, "human_active")) {
        return {
          success: false,
          error: createAppError(
            "CONVERSATION_INVALID_TRANSITION",
            `Transição de estado inválida: ${conversation.status} → human_active`,
          ),
        };
      }

      await deps.conversationRepository.updateStatus(
        tenantId,
        conversationId,
        "human_active",
        assignedTo,
      );

      await deps.sessionRepository.updateMode(tenantId, conversation.sessionId, "human_active");

      const updated: ConversationEntity = {
        ...conversation,
        status: "human_active",
        assignedTo,
        updatedAt: new Date(),
      };

      await deps.eventPublisher.publish({
        type: "conversation.human_active",
        tenantId,
        conversationId,
        phone: conversation.phone,
        timestamp: Date.now(),
        payload: {
          sessionId: conversation.sessionId,
          assignedTo,
        },
      });

      deps.logger.info("Conversa atribuída a agente.", {
        correlationId,
        tenantId: tenantId as string & { readonly __brand: "TenantId" },
      });

      return { success: true, conversation: updated };
    },
  };
}

export type { AssignConversationDependencies, AssignConversationInput, AssignConversationResult };
