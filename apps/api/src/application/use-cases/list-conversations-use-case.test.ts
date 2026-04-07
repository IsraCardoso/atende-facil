import { describe, expect, it } from "vitest";

import { createConversationId } from "../../domain/conversation-types";
import { createPhone, createSessionId } from "../../domain/whatsapp-types";
import { createInMemoryConversationRepository } from "../../infrastructure/repositories/in-memory-conversation-repository";
import { createListConversationsUseCase } from "./list-conversations-use-case";
import { createTestConversation } from "./test-support";

function createSut() {
  const repo = createInMemoryConversationRepository();
  const useCase = createListConversationsUseCase({ conversationRepository: repo });
  return { repo, useCase };
}

describe("ListConversationsUseCase", () => {
  it("should return empty result when no conversations exist", async () => {
    const { useCase } = createSut();

    const result = await useCase.execute({
      tenantId: "tenant-1",
      status: undefined,
      page: undefined,
      limit: undefined,
    });

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it("should return paginated conversations for tenant", async () => {
    const { repo, useCase } = createSut();

    const savePromises = Array.from({ length: 25 }, (_, i) =>
      repo.save(
        createTestConversation({
          id: createConversationId(`conv-${i}`),
          tenantId: "tenant-1",
          sessionId: createSessionId(`sess-${i}`),
          phone: createPhone(`551199900000${String(i).padStart(2, "0")}`),
        }),
      ),
    );
    await Promise.all(savePromises);

    const result = await useCase.execute({
      tenantId: "tenant-1",
      status: undefined,
      page: 1,
      limit: 20,
    });

    expect(result.data).toHaveLength(20);
    expect(result.total).toBe(25);
    expect(result.hasMore).toBe(true);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("should filter by status", async () => {
    const { repo, useCase } = createSut();

    await repo.save(createTestConversation({ id: createConversationId("c1"), status: "bot" }));
    await repo.save(
      createTestConversation({
        id: createConversationId("c2"),
        sessionId: createSessionId("s2"),
        status: "waiting_human",
      }),
    );
    await repo.save(
      createTestConversation({
        id: createConversationId("c3"),
        sessionId: createSessionId("s3"),
        status: "waiting_human",
      }),
    );

    const result = await useCase.execute({
      tenantId: "tenant-1",
      status: "waiting_human",
      page: undefined,
      limit: undefined,
    });

    expect(result.data).toHaveLength(2);
    expect(result.data.every((c) => c.status === "waiting_human")).toBe(true);
  });

  it("should enforce tenant isolation", async () => {
    const { repo, useCase } = createSut();

    await repo.save(
      createTestConversation({ id: createConversationId("c1"), tenantId: "tenant-1" }),
    );
    await repo.save(
      createTestConversation({
        id: createConversationId("c2"),
        tenantId: "tenant-2",
        sessionId: createSessionId("s2"),
      }),
    );

    const result = await useCase.execute({
      tenantId: "tenant-1",
      status: undefined,
      page: undefined,
      limit: undefined,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.tenantId).toBe("tenant-1");
  });

  it("should clamp limit to max 100", async () => {
    const { useCase } = createSut();

    const result = await useCase.execute({
      tenantId: "tenant-1",
      status: undefined,
      page: 1,
      limit: 500,
    });

    expect(result.limit).toBe(100);
  });

  it("should default page to 1 and limit to 20", async () => {
    const { useCase } = createSut();

    const result = await useCase.execute({
      tenantId: "tenant-1",
      status: undefined,
      page: undefined,
      limit: undefined,
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("should ignore invalid status values", async () => {
    const { repo, useCase } = createSut();

    await repo.save(createTestConversation({ id: createConversationId("c1"), status: "bot" }));

    const result = await useCase.execute({
      tenantId: "tenant-1",
      status: "invalid_status",
      page: undefined,
      limit: undefined,
    });

    expect(result.data).toHaveLength(1);
  });
});
