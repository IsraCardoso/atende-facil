import { describe, expect, it, vi } from "vitest";

import type { AppLoggerPort } from "../../domain/ports/auth-ports";
import type { ConversationRepositoryPort } from "../../domain/ports/conversation-ports";
import type {
  ChatwootPort,
  SessionLockPort,
  SessionRepositoryPort,
  WebhookIdempotencyPort,
  WhatsAppSenderPort,
} from "../../domain/ports/whatsapp-ports";
import type { FlowEntity, FlowId } from "../../domain/flow-types";
import type { FlowResolverService } from "../services/flow-resolver-service";
import type {
  CanonicalInboundMessage,
  SessionEntity,
  WhatsAppInstanceConfig,
} from "../../domain/whatsapp-types";
import { createPhone, createWhatsAppMessageId } from "../../domain/whatsapp-types";
import { createInMemoryEventPublisher } from "../../infrastructure/events/in-memory-event-publisher";
import { createInMemoryConversationRepository } from "../../infrastructure/repositories/in-memory-conversation-repository";
import { createProcessIncomingMessageUseCase } from "./process-incoming-message-use-case";

function createFakeLogger(): AppLoggerPort {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createFakeSessionRepository(): SessionRepositoryPort {
  const sessions = new Map<string, SessionEntity>();

  return {
    async findByTenantAndPhone(tenantId: string, phone: string) {
      return sessions.get(`${tenantId}:${phone}`) ?? null;
    },
    async save(session: SessionEntity) {
      sessions.set(`${session.tenantId}:${session.phone}`, session);
      return session;
    },
    async updateMode() {
      /* no-op for test */
    },
  };
}

function createFakeSessionLock(): SessionLockPort {
  return {
    async acquire() {
      return true;
    },
    async release() {
      /* no-op for test */
    },
  };
}

function createFakeIdempotency(): WebhookIdempotencyPort {
  const processed = new Set<string>();
  return {
    async isProcessed(_provider, messageId) {
      return processed.has(messageId);
    },
    async markProcessed(_provider, messageId, _ttlSeconds) {
      processed.add(messageId);
    },
  };
}

function createFakeSender(): WhatsAppSenderPort {
  return {
    async sendText() {
      return {
        messageId: createWhatsAppMessageId("sent-1"),
        status: "sent" as const,
        timestamp: Date.now(),
      };
    },
  };
}

function createFakeChatwoot(): ChatwootPort {
  return {
    async createConversation() {
      return "cw-1" as string & { readonly __brand: "ChatwootConversationId" };
    },
    async sendMessage() {
      /* no-op for test */
    },
    async findConversationBySessionId() {
      return null;
    },
  };
}

function createFakeFlowResolver(flow: FlowEntity | null = null): FlowResolverService {
  const defaultFlow: FlowEntity = {
    id: "flow-1" as FlowId,
    tenantId: "tenant-1",
    name: "Test Flow",
    description: null,
    definition: {
      nodes: [{ id: "start", type: "message", text: "Bem-vindo!" }],
      edges: [],
      startNodeId: "start",
    },
    status: "active",
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
  return {
    async resolveFlow() {
      return flow === undefined ? null : (flow ?? defaultFlow);
    },
    async invalidateCache() {},
  };
}

function createNoFlowResolver(): FlowResolverService {
  return {
    async resolveFlow() {
      return null;
    },
    async invalidateCache() {},
  };
}

function createTestMessage(): CanonicalInboundMessage {
  return {
    messageId: createWhatsAppMessageId("msg-001"),
    from: createPhone("5511999999999"),
    text: "Olá",
    timestamp: Date.now(),
    provider: "evolution",
    rawPayload: {},
  };
}

function createTestInstanceConfig(): WhatsAppInstanceConfig {
  return {
    provider: "evolution",
    config: {
      instanceName: "test",
      apiUrl: "http://localhost",
      apiKey: "key-123",
    },
  };
}

function createFullDeps(overrides?: {
  sessionRepository?: SessionRepositoryPort;
  conversationRepository?: ConversationRepositoryPort;
  sessionLock?: SessionLockPort;
  webhookIdempotency?: WebhookIdempotencyPort;
  flowResolver?: FlowResolverService;
}) {
  return {
    sessionRepository: overrides?.sessionRepository ?? createFakeSessionRepository(),
    conversationRepository:
      overrides?.conversationRepository ?? createInMemoryConversationRepository(),
    sessionLock: overrides?.sessionLock ?? createFakeSessionLock(),
    webhookIdempotency: overrides?.webhookIdempotency ?? createFakeIdempotency(),
    whatsAppSender: createFakeSender(),
    chatwootPort: createFakeChatwoot(),
    flowResolver: overrides?.flowResolver ?? createFakeFlowResolver(),
    eventPublisher: createInMemoryEventPublisher(),
    logger: createFakeLogger(),
  };
}

describe("ProcessIncomingMessageUseCase", () => {
  it("should reject duplicate webhook", async () => {
    const idempotency = createFakeIdempotency();
    const message = createTestMessage();
    await idempotency.markProcessed("evolution", message.messageId, 86400);

    const deps = createFullDeps({ webhookIdempotency: idempotency });
    const useCase = createProcessIncomingMessageUseCase(deps);

    const result = await useCase.execute({
      tenantId: "tenant-1",
      instanceConfig: createTestInstanceConfig(),
      message,
      correlationId: "corr-1",
    });

    expect(result.processed).toBe(false);
    if (!result.processed) {
      expect(result.reason).toBe("duplicate");
    }
  });

  it("should reject when lock not acquired", async () => {
    const lockPort: SessionLockPort = {
      async acquire() {
        return false;
      },
      async release() {
        /* no-op */
      },
    };

    const deps = createFullDeps({ sessionLock: lockPort });
    const useCase = createProcessIncomingMessageUseCase(deps);

    const result = await useCase.execute({
      tenantId: "tenant-1",
      instanceConfig: createTestInstanceConfig(),
      message: createTestMessage(),
      correlationId: "corr-2",
    });

    expect(result.processed).toBe(false);
    if (!result.processed) {
      expect(result.reason).toBe("lock_not_acquired");
    }
  });

  it("should return no_active_flow when no flow exists", async () => {
    const deps = createFullDeps({ flowResolver: createNoFlowResolver() });
    const useCase = createProcessIncomingMessageUseCase(deps);

    const result = await useCase.execute({
      tenantId: "tenant-1",
      instanceConfig: createTestInstanceConfig(),
      message: createTestMessage(),
      correlationId: "corr-3",
    });

    expect(result.processed).toBe(false);
    if (!result.processed) {
      expect(result.reason).toBe("no_active_flow");
    }
  });

  it("should process message through flow engine and create conversation", async () => {
    const conversationRepository = createInMemoryConversationRepository();
    const deps = createFullDeps({ conversationRepository });
    const useCase = createProcessIncomingMessageUseCase(deps);

    const result = await useCase.execute({
      tenantId: "tenant-1",
      instanceConfig: createTestInstanceConfig(),
      message: createTestMessage(),
      correlationId: "corr-4",
    });

    expect(result.processed).toBe(true);
    const conversations = conversationRepository.getAll();
    expect(conversations.length).toBe(1);
    expect(conversations[0]?.status).toBe("bot");
  });

  it("should emit conversation.handed_off event on transfer", async () => {
    const conversationRepository = createInMemoryConversationRepository();
    const eventPublisher = createInMemoryEventPublisher();
    const transferFlow: FlowEntity = {
      id: "flow-1" as FlowId,
      tenantId: "tenant-1",
      name: "Transfer Flow",
      description: null,
      definition: {
        nodes: [{ id: "start", type: "transfer", reason: "Preciso de ajuda" }],
        edges: [],
        startNodeId: "start",
      },
      status: "active",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    const flowResolver = createFakeFlowResolver(transferFlow);

    const useCase = createProcessIncomingMessageUseCase({
      ...createFullDeps({ conversationRepository, flowResolver }),
      eventPublisher,
    });

    const result = await useCase.execute({
      tenantId: "tenant-1",
      instanceConfig: createTestInstanceConfig(),
      message: createTestMessage(),
      correlationId: "corr-5",
    });

    expect(result.processed).toBe(true);
    if (result.processed) {
      expect(result.action).toBe("transferred_to_human");
    }

    const events = eventPublisher.getPublishedEvents();
    expect(events.length).toBe(1);
    expect(events[0]?.type).toBe("conversation.handed_off");
  });
});
