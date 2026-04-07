import { describe, expect, it } from "vitest";

import { createConversationId } from "../../domain/conversation-types";
import { createInMemoryEventPublisher } from "../../infrastructure/events/in-memory-event-publisher";
import { createInMemoryConversationRepository } from "../../infrastructure/repositories/in-memory-conversation-repository";
import { createCloseConversationUseCase } from "./close-conversation-use-case";
import {
  createFakeLogger,
  createFakeSessionRepository,
  createTestConversation,
  createTestSession,
} from "./test-support";

describe("CloseConversationUseCase", () => {
  it("should transition human_active to bot and reset session", async () => {
    const conversationRepo = createInMemoryConversationRepository();
    const sessionRepo = createFakeSessionRepository();
    const publisher = createInMemoryEventPublisher();

    const conversation = createTestConversation({ status: "human_active", assignedTo: "agent-1" });
    await conversationRepo.save(conversation);
    sessionRepo.seed(
      createTestSession({
        currentNodeId: "node-5",
        mode: "human_active",
        data: { name: "John" },
        flowId: "flow-1",
      }),
    );

    const useCase = createCloseConversationUseCase({
      conversationRepository: conversationRepo,
      sessionRepository: sessionRepo,
      eventPublisher: publisher,
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      tenantId: "tenant-1",
      conversationId: conversation.id,
      correlationId: "corr-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.conversation.status).toBe("bot");
      expect(result.conversation.assignedTo).toBeNull();
    }

    const events = publisher.getPublishedEvents();
    expect(events.length).toBe(1);
    expect(events[0]?.type).toBe("conversation.bot_resumed");

    const session = await sessionRepo.findByTenantAndPhone("tenant-1", "5511999999999");
    expect(session?.currentNodeId).toBeNull();
    expect(session?.mode).toBe("bot");
    expect(session?.data).toEqual({});
    expect(session?.flowId).toBeNull();
  });

  it("should transition waiting_human to bot", async () => {
    const conversationRepo = createInMemoryConversationRepository();
    const sessionRepo = createFakeSessionRepository();
    const publisher = createInMemoryEventPublisher();

    const conversation = createTestConversation({ status: "waiting_human" });
    await conversationRepo.save(conversation);
    sessionRepo.seed(createTestSession());

    const useCase = createCloseConversationUseCase({
      conversationRepository: conversationRepo,
      sessionRepository: sessionRepo,
      eventPublisher: publisher,
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      tenantId: "tenant-1",
      conversationId: conversation.id,
      correlationId: "corr-2",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.conversation.status).toBe("bot");
    }

    expect(publisher.getPublishedEvents()[0]?.type).toBe("conversation.bot_resumed");
  });

  it("should reject invalid transition bot to bot", async () => {
    const conversationRepo = createInMemoryConversationRepository();
    const conversation = createTestConversation({ status: "bot" });
    await conversationRepo.save(conversation);

    const useCase = createCloseConversationUseCase({
      conversationRepository: conversationRepo,
      sessionRepository: createFakeSessionRepository(),
      eventPublisher: createInMemoryEventPublisher(),
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      tenantId: "tenant-1",
      conversationId: conversation.id,
      correlationId: "corr-3",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("CONVERSATION_INVALID_TRANSITION");
    }
  });

  it("should return not found when conversation does not exist", async () => {
    const useCase = createCloseConversationUseCase({
      conversationRepository: createInMemoryConversationRepository(),
      sessionRepository: createFakeSessionRepository(),
      eventPublisher: createInMemoryEventPublisher(),
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      tenantId: "tenant-1",
      conversationId: createConversationId("nonexistent"),
      correlationId: "corr-4",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("CONVERSATION_NOT_FOUND");
    }
  });
});
