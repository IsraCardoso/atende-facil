/** Testes do SyncChatwootStatusUseCase — cenarios: assigned, resolved, not found. */
import { describe, expect, it, vi } from "vitest";

import { createChatwootConversationId } from "../../domain/whatsapp-types";
import { createSyncChatwootStatusUseCase } from "./sync-chatwoot-status-use-case";
import { createFakeLogger, createTestConversation } from "./test-support";

function createDeps() {
  const conversation = createTestConversation();
  return {
    conversationRepository: {
      findByChatwootConversationId: vi.fn().mockResolvedValue(conversation),
      findById: vi.fn(),
      findBySessionId: vi.fn(),
      findByTenantAndStatus: vi.fn(),
      findByTenantPaginated: vi.fn(),
      save: vi.fn(),
      updateStatus: vi.fn(),
    },
    assignConversation: {
      execute: vi.fn().mockResolvedValue({ success: true, conversation }),
    },
    closeConversation: {
      execute: vi.fn().mockResolvedValue({ success: true, conversation }),
    },
    logger: createFakeLogger(),
    conversation,
  };
}

describe("SyncChatwootStatusUseCase", () => {
  it("should assign conversation on conversation_assigned event", async () => {
    const { conversationRepository, assignConversation, closeConversation, logger } = createDeps();
    const useCase = createSyncChatwootStatusUseCase({
      conversationRepository,
      assignConversation: assignConversation as never,
      closeConversation: closeConversation as never,
      logger,
    });

    const result = await useCase.execute({
      chatwootConversationId: createChatwootConversationId("cw-1"),
      eventType: "conversation_assigned",
      assignedAgentName: "Agent Smith",
      correlationId: "corr-1",
    });

    expect(result.success).toBe(true);
    expect(assignConversation.execute).toHaveBeenCalled();
    expect(closeConversation.execute).not.toHaveBeenCalled();
  });

  it("should close conversation on conversation_resolved event", async () => {
    const { conversationRepository, assignConversation, closeConversation, logger } = createDeps();
    const useCase = createSyncChatwootStatusUseCase({
      conversationRepository,
      assignConversation: assignConversation as never,
      closeConversation: closeConversation as never,
      logger,
    });

    const result = await useCase.execute({
      chatwootConversationId: createChatwootConversationId("cw-1"),
      eventType: "conversation_resolved",
      assignedAgentName: null,
      correlationId: "corr-2",
    });

    expect(result.success).toBe(true);
    expect(closeConversation.execute).toHaveBeenCalled();
    expect(assignConversation.execute).not.toHaveBeenCalled();
  });

  it("should succeed gracefully when conversation not found", async () => {
    const { conversationRepository, assignConversation, closeConversation, logger } = createDeps();
    conversationRepository.findByChatwootConversationId.mockResolvedValue(null);

    const useCase = createSyncChatwootStatusUseCase({
      conversationRepository,
      assignConversation: assignConversation as never,
      closeConversation: closeConversation as never,
      logger,
    });

    const result = await useCase.execute({
      chatwootConversationId: createChatwootConversationId("cw-unknown"),
      eventType: "conversation_assigned",
      assignedAgentName: null,
      correlationId: "corr-3",
    });

    expect(result.success).toBe(true);
    expect(assignConversation.execute).not.toHaveBeenCalled();
  });
});
