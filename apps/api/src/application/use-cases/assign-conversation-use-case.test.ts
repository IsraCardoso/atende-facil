import { describe, expect, it } from "vitest";

import { createConversationId } from "../../domain/conversation-types";
import { createInMemoryEventPublisher } from "../../infrastructure/events/in-memory-event-publisher";
import { createInMemoryConversationRepository } from "../../infrastructure/repositories/in-memory-conversation-repository";
import { createAssignConversationUseCase } from "./assign-conversation-use-case";
import {
  createFakeLogger,
  createFakeSessionRepository,
  createTestConversation,
} from "./test-support";

describe("AssignConversationUseCase", () => {
  it("should transition waiting_human to human_active", async () => {
    const repo = createInMemoryConversationRepository();
    const publisher = createInMemoryEventPublisher();
    const conversation = createTestConversation({ status: "waiting_human" });
    await repo.save(conversation);

    const useCase = createAssignConversationUseCase({
      conversationRepository: repo,
      sessionRepository: createFakeSessionRepository(),
      eventPublisher: publisher,
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      tenantId: "tenant-1",
      conversationId: conversation.id,
      assignedTo: "agent-1",
      correlationId: "corr-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.conversation.status).toBe("human_active");
      expect(result.conversation.assignedTo).toBe("agent-1");
    }

    const events = publisher.getPublishedEvents();
    expect(events.length).toBe(1);
    expect(events[0]?.type).toBe("conversation.human_active");
  });

  it("should reject invalid transition bot to human_active", async () => {
    const repo = createInMemoryConversationRepository();
    const conversation = createTestConversation({ status: "bot" });
    await repo.save(conversation);

    const useCase = createAssignConversationUseCase({
      conversationRepository: repo,
      sessionRepository: createFakeSessionRepository(),
      eventPublisher: createInMemoryEventPublisher(),
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      tenantId: "tenant-1",
      conversationId: conversation.id,
      assignedTo: null,
      correlationId: "corr-2",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("CONVERSATION_INVALID_TRANSITION");
    }
  });

  it("should reject when already human_active", async () => {
    const repo = createInMemoryConversationRepository();
    const conversation = createTestConversation({ status: "human_active" });
    await repo.save(conversation);

    const useCase = createAssignConversationUseCase({
      conversationRepository: repo,
      sessionRepository: createFakeSessionRepository(),
      eventPublisher: createInMemoryEventPublisher(),
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      tenantId: "tenant-1",
      conversationId: conversation.id,
      assignedTo: null,
      correlationId: "corr-3",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("CONVERSATION_INVALID_TRANSITION");
    }
  });

  it("should return not found when conversation does not exist", async () => {
    const useCase = createAssignConversationUseCase({
      conversationRepository: createInMemoryConversationRepository(),
      sessionRepository: createFakeSessionRepository(),
      eventPublisher: createInMemoryEventPublisher(),
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      tenantId: "tenant-1",
      conversationId: createConversationId("nonexistent"),
      assignedTo: null,
      correlationId: "corr-4",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("CONVERSATION_NOT_FOUND");
    }
  });
});
