import { describe, expect, it, vi } from "vitest";

import type { AppLoggerPort } from "../../domain/ports/auth-ports";
import type {
  ChatwootPort,
  FlowRepositoryPort,
  SessionLockPort,
  SessionRepositoryPort,
  WebhookIdempotencyPort,
  WhatsAppSenderPort,
} from "../../domain/ports/whatsapp-ports";
import type {
  CanonicalInboundMessage,
  SessionEntity,
  WhatsAppInstanceConfig,
} from "../../domain/whatsapp-types";
import { createPhone, createWhatsAppMessageId } from "../../domain/whatsapp-types";
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
    async findByTenantAndPhone() {
      return sessions.get("tenant-1:5511999999999") ?? null;
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

function createFakeFlowRepository(hasFlow = true): FlowRepositoryPort {
  return {
    async findActiveByTenant() {
      if (!hasFlow) {
        return null;
      }

      return {
        id: "flow-1",
        tenantId: "tenant-1",
        definition: {
          nodes: [
            {
              id: "start",
              type: "message",
              text: "Bem-vindo!",
            },
          ],
          edges: [],
          startNodeId: "start",
        },
      };
    },
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

describe("ProcessIncomingMessageUseCase", () => {
  it("should reject duplicate webhook", async () => {
    const idempotency = createFakeIdempotency();
    const message = createTestMessage();
    await idempotency.markProcessed("evolution", message.messageId, 86400);

    const useCase = createProcessIncomingMessageUseCase({
      sessionRepository: createFakeSessionRepository(),
      sessionLock: createFakeSessionLock(),
      webhookIdempotency: idempotency,
      whatsAppSender: createFakeSender(),
      chatwootPort: createFakeChatwoot(),
      flowRepository: createFakeFlowRepository(),
      logger: createFakeLogger(),
    });

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
        /* no-op for test */
      },
    };

    const useCase = createProcessIncomingMessageUseCase({
      sessionRepository: createFakeSessionRepository(),
      sessionLock: lockPort,
      webhookIdempotency: createFakeIdempotency(),
      whatsAppSender: createFakeSender(),
      chatwootPort: createFakeChatwoot(),
      flowRepository: createFakeFlowRepository(),
      logger: createFakeLogger(),
    });

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
    const useCase = createProcessIncomingMessageUseCase({
      sessionRepository: createFakeSessionRepository(),
      sessionLock: createFakeSessionLock(),
      webhookIdempotency: createFakeIdempotency(),
      whatsAppSender: createFakeSender(),
      chatwootPort: createFakeChatwoot(),
      flowRepository: createFakeFlowRepository(false),
      logger: createFakeLogger(),
    });

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

  it("should process message through flow engine", async () => {
    const useCase = createProcessIncomingMessageUseCase({
      sessionRepository: createFakeSessionRepository(),
      sessionLock: createFakeSessionLock(),
      webhookIdempotency: createFakeIdempotency(),
      whatsAppSender: createFakeSender(),
      chatwootPort: createFakeChatwoot(),
      flowRepository: createFakeFlowRepository(),
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      tenantId: "tenant-1",
      instanceConfig: createTestInstanceConfig(),
      message: createTestMessage(),
      correlationId: "corr-4",
    });

    expect(result.processed).toBe(true);
  });
});
