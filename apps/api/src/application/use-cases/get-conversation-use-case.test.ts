import { describe, expect, it } from "vitest";

import { createConversationId } from "../../domain/conversation-types";
import { createInMemoryConversationRepository } from "../../infrastructure/repositories/in-memory-conversation-repository";
import { createGetConversationUseCase } from "./get-conversation-use-case";
import { createTestConversation } from "./test-support";

function createSut() {
  const repo = createInMemoryConversationRepository();
  const useCase = createGetConversationUseCase({ conversationRepository: repo });
  return { repo, useCase };
}

describe("GetConversationUseCase", () => {
  it("should return conversation when found for tenant", async () => {
    const { repo, useCase } = createSut();

    const conversation = createTestConversation({
      id: createConversationId("conv-1"),
      tenantId: "tenant-1",
    });
    await repo.save(conversation);

    const result = await useCase.execute({
      tenantId: "tenant-1",
      conversationId: createConversationId("conv-1"),
    });

    expect(result.id).toBe("conv-1");
    expect(result.tenantId).toBe("tenant-1");
  });

  it("should throw CONVERSATION_NOT_FOUND when conversation does not exist", async () => {
    const { useCase } = createSut();

    await expect(
      useCase.execute({
        tenantId: "tenant-1",
        conversationId: createConversationId("nonexistent"),
      }),
    ).rejects.toThrow("Conversa não encontrada.");
  });

  it("should throw CONVERSATION_NOT_FOUND when conversation belongs to different tenant", async () => {
    const { repo, useCase } = createSut();

    await repo.save(
      createTestConversation({
        id: createConversationId("conv-1"),
        tenantId: "tenant-1",
      }),
    );

    await expect(
      useCase.execute({
        tenantId: "tenant-2",
        conversationId: createConversationId("conv-1"),
      }),
    ).rejects.toThrow("Conversa não encontrada.");
  });
});
