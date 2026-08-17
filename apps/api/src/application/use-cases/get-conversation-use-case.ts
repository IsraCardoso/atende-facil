/** Retorna detalhe de uma conversation por ID, com validação de tenant ownership (RN-018). */

import type { ConversationEntity, ConversationId } from "../../domain/conversation-types";
import type { ConversationRepositoryPort } from "../../domain/ports/conversation-ports";
import { createAppError } from "../errors/app-error";

type GetConversationInput = Readonly<{
  tenantId: string;
  conversationId: ConversationId;
}>;

type GetConversationUseCaseDeps = Readonly<{
  conversationRepository: ConversationRepositoryPort;
}>;

function createGetConversationUseCase(deps: GetConversationUseCaseDeps) {
  return {
    async execute(input: GetConversationInput): Promise<ConversationEntity> {
      const conversation = await deps.conversationRepository.findById(
        input.tenantId,
        input.conversationId,
      );
      if (!conversation) {
        throw createAppError("CONVERSATION_NOT_FOUND", "Conversa não encontrada.");
      }
      return conversation;
    },
  };
}

export type { GetConversationInput, GetConversationUseCaseDeps };
export { createGetConversationUseCase };
