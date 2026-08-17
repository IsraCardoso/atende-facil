/** Testes unitarios dos repositorios Drizzle de WhatsApp/Conversation — valida contratos via mock DB. */
import { describe, expect, it, vi } from "vitest";
import type { ConversationEntity } from "../../domain/conversation-types";
import { createConversationId } from "../../domain/conversation-types";
import type { SessionEntity } from "../../domain/whatsapp-types";
import { createPhone, createSessionId } from "../../domain/whatsapp-types";
import { createDrizzleConversationRepository } from "./drizzle-conversation-repository";
import { createDrizzleSessionRepository } from "./drizzle-session-repository";
import { createDrizzleWhatsAppInstanceRepository } from "./drizzle-whatsapp-instance-repository";

function createMockDb() {
  const mockReturning = vi.fn();
  const mockLimit = vi.fn();
  const mockWhere = vi.fn();
  const mockOffset = vi.fn();

  const chainableSelect = {
    from: vi.fn().mockReturnValue({
      where: mockWhere.mockReturnValue({
        limit: mockLimit,
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: mockOffset,
          }),
        }),
      }),
    }),
  };

  const chainableInsert = {
    values: vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockReturnValue({
        returning: mockReturning,
      }),
      returning: mockReturning,
    }),
  };

  const chainableUpdate = {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };

  const db = {
    select: vi.fn().mockReturnValue(chainableSelect),
    insert: vi.fn().mockReturnValue(chainableInsert),
    update: vi.fn().mockReturnValue(chainableUpdate),
    mocks: { mockReturning, mockLimit, mockWhere, mockOffset },
  };

  return db;
}

const now = new Date("2026-04-07T00:00:00Z");

const sessionRow = {
  id: "s-001",
  tenantId: "t-001",
  phone: "5511999990000",
  currentNodeId: null,
  mode: "bot",
  data: {},
  flowId: null,
  createdAt: now,
  updatedAt: now,
};

const instanceRow = {
  id: "i-001",
  tenantId: "t-001",
  provider: "evolution",
  displayName: "WhatsApp",
  config: { instanceName: "test" },
  active: true,
  isPrimary: true,
  createdAt: now,
  updatedAt: now,
};

const conversationRow = {
  id: "c-001",
  tenantId: "t-001",
  sessionId: "s-001",
  phone: "5511999990000",
  status: "bot",
  assignedTo: null,
  chatwootConversationId: null,
  createdAt: now,
  updatedAt: now,
};

describe("DrizzleSessionRepository", () => {
  it("should find session by tenant and phone", async () => {
    const db = createMockDb();
    db.mocks.mockLimit.mockResolvedValue([sessionRow]);

    const repo = createDrizzleSessionRepository(db as never);
    const result = await repo.findByTenantAndPhone("t-001", createPhone("5511999990000"));

    expect(result).not.toBeNull();
    expect(result?.id).toBe("s-001");
    expect(result?.mode).toBe("bot");
  });

  it("should return null when session not found", async () => {
    const db = createMockDb();
    db.mocks.mockLimit.mockResolvedValue([]);

    const repo = createDrizzleSessionRepository(db as never);
    const result = await repo.findByTenantAndPhone("t-001", createPhone("0000000"));

    expect(result).toBeNull();
  });

  it("should save session and return entity", async () => {
    const db = createMockDb();
    db.mocks.mockReturning.mockResolvedValue([sessionRow]);

    const repo = createDrizzleSessionRepository(db as never);
    const session: SessionEntity = {
      id: createSessionId("s-001"),
      tenantId: "t-001",
      phone: createPhone("5511999990000"),
      currentNodeId: null,
      mode: "bot",
      data: {},
      flowId: null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await repo.save(session);
    expect(result.id).toBe("s-001");
  });

  it("should update mode without error", async () => {
    const db = createMockDb();
    const repo = createDrizzleSessionRepository(db as never);

    await expect(
      repo.updateMode("t-001", createSessionId("s-001"), "waiting_human"),
    ).resolves.toBeUndefined();
  });
});

describe("DrizzleWhatsAppInstanceRepository", () => {
  it("should find instance by tenant and id", async () => {
    const db = createMockDb();
    db.mocks.mockLimit.mockResolvedValue([instanceRow]);

    const repo = createDrizzleWhatsAppInstanceRepository(db as never);
    const result = await repo.findByTenantAndId("t-001", "i-001" as never);

    expect(result).not.toBeNull();
    expect(result?.provider).toBe("evolution");
  });

  it("should return null when instance not found", async () => {
    const db = createMockDb();
    db.mocks.mockLimit.mockResolvedValue([]);

    const repo = createDrizzleWhatsAppInstanceRepository(db as never);
    const result = await repo.findByTenantAndId("t-001", "xxx" as never);

    expect(result).toBeNull();
  });

  it("should find active instances by tenant", async () => {
    const db = createMockDb();
    const mockFrom = {
      where: vi.fn().mockResolvedValue([instanceRow]),
    };
    db.select.mockReturnValue({ from: vi.fn().mockReturnValue(mockFrom) });

    const repo = createDrizzleWhatsAppInstanceRepository(db as never);
    const result = await repo.findActiveByTenant("t-001");

    expect(result).toHaveLength(1);
    expect(result[0]?.active).toBe(true);
  });
});

describe("DrizzleConversationRepository", () => {
  it("should find conversation by id", async () => {
    const db = createMockDb();
    db.mocks.mockLimit.mockResolvedValue([conversationRow]);

    const repo = createDrizzleConversationRepository(db as never);
    const result = await repo.findById("t-001", createConversationId("c-001"));

    expect(result).not.toBeNull();
    expect(result?.status).toBe("bot");
  });

  it("should return null when conversation not found", async () => {
    const db = createMockDb();
    db.mocks.mockLimit.mockResolvedValue([]);

    const repo = createDrizzleConversationRepository(db as never);
    const result = await repo.findById("t-001", createConversationId("xxx"));

    expect(result).toBeNull();
  });

  it("should save conversation and return entity", async () => {
    const db = createMockDb();
    db.mocks.mockReturning.mockResolvedValue([conversationRow]);

    const repo = createDrizzleConversationRepository(db as never);
    const conversation: ConversationEntity = {
      id: createConversationId("c-001"),
      tenantId: "t-001",
      sessionId: createSessionId("s-001"),
      phone: createPhone("5511999990000"),
      status: "bot",
      assignedTo: null,
      chatwootConversationId: null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await repo.save(conversation);
    expect(result.id).toBe("c-001");
  });

  it("should find by tenant and status", async () => {
    const db = createMockDb();
    const mockFrom = {
      where: vi.fn().mockResolvedValue([conversationRow]),
    };
    db.select.mockReturnValue({ from: vi.fn().mockReturnValue(mockFrom) });

    const repo = createDrizzleConversationRepository(db as never);
    const result = await repo.findByTenantAndStatus("t-001", "bot");

    expect(result).toHaveLength(1);
  });

  it("should update status without error", async () => {
    const db = createMockDb();
    const repo = createDrizzleConversationRepository(db as never);

    await expect(
      repo.updateStatus("t-001", createConversationId("c-001"), "waiting_human"),
    ).resolves.toBeUndefined();
  });
});
