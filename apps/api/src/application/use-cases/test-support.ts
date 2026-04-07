import type { ConversationEntity } from "../../domain/conversation-types";
import { createConversationId } from "../../domain/conversation-types";
import type { AppLoggerPort } from "../../domain/ports/auth-ports";
import type { SessionEntity } from "../../domain/whatsapp-types";
import { createPhone, createSessionId } from "../../domain/whatsapp-types";
import type { IdentityCacheService } from "../services";

export function createIdentityCacheServiceStub(
  overrides: Partial<IdentityCacheService> = {},
): IdentityCacheService {
  const defaultService: IdentityCacheService = {
    async getOrLoad(_input, loader) {
      return loader();
    },
    async invalidate() {
      return undefined;
    },
  };

  return {
    ...defaultService,
    ...overrides,
  };
}

export function createFakeLogger(): AppLoggerPort {
  return {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };
}

export function createTestConversation(
  overrides: Partial<ConversationEntity> = {},
): ConversationEntity {
  return {
    id: createConversationId("conv-1"),
    tenantId: "tenant-1",
    sessionId: createSessionId("sess-1"),
    phone: createPhone("5511999999999"),
    status: "waiting_human",
    assignedTo: null,
    chatwootConversationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestSession(overrides: Partial<SessionEntity> = {}): SessionEntity {
  return {
    id: createSessionId("sess-1"),
    tenantId: "tenant-1",
    phone: createPhone("5511999999999"),
    currentNodeId: null,
    mode: "bot",
    data: {},
    flowId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createFakeSessionRepository() {
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
    seed(session: SessionEntity) {
      sessions.set(`${session.tenantId}:${session.phone}`, session);
    },
  };
}
