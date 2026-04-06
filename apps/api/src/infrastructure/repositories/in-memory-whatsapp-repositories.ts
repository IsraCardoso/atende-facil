/** Repositórios in-memory para sessões e instâncias WhatsApp. Usados em dev/test; produção usará Drizzle. */
import type {
  SessionRepositoryPort,
  WhatsAppInstanceRepositoryPort,
} from "../../domain/ports/whatsapp-ports";
import type {
  ChatwootConversationId,
  Phone,
  SessionEntity,
  SessionId,
  SessionMode,
  WhatsAppInstanceEntity,
  WhatsAppInstanceId,
} from "../../domain/whatsapp-types";

type InMemoryWhatsAppRepositories = Readonly<{
  sessionRepository: SessionRepositoryPort;
  instanceRepository: WhatsAppInstanceRepositoryPort;
}>;

function createSessionKey(tenantId: string, phone: Phone): string {
  return `${tenantId}:${phone}`;
}

function createInMemorySessionRepository(): SessionRepositoryPort {
  const sessionsById = new Map<SessionId, SessionEntity>();
  const sessionIdByTenantPhone = new Map<string, SessionId>();

  return {
    async findByTenantAndPhone(tenantId: string, phone: Phone): Promise<SessionEntity | null> {
      const key = createSessionKey(tenantId, phone);
      const sessionId = sessionIdByTenantPhone.get(key);
      if (!sessionId) {
        return null;
      }
      return sessionsById.get(sessionId) ?? null;
    },

    async save(session: SessionEntity): Promise<SessionEntity> {
      sessionsById.set(session.id, session);
      sessionIdByTenantPhone.set(createSessionKey(session.tenantId, session.phone), session.id);
      return session;
    },

    async updateMode(
      tenantId: string,
      sessionId: SessionId,
      mode: SessionMode,
      chatwootConversationId?: ChatwootConversationId,
    ): Promise<void> {
      const existing = sessionsById.get(sessionId);
      if (!existing || existing.tenantId !== tenantId) {
        return;
      }

      const updated: SessionEntity = {
        ...existing,
        mode,
        ...(chatwootConversationId !== undefined ? { chatwootConversationId } : {}),
        updatedAt: new Date(),
      };
      sessionsById.set(sessionId, updated);
    },
  };
}

function createInMemoryWhatsAppInstanceRepository(): WhatsAppInstanceRepositoryPort {
  const instancesById = new Map<string, WhatsAppInstanceEntity>();

  return {
    async findByTenantAndId(
      tenantId: string,
      instanceId: WhatsAppInstanceId,
    ): Promise<WhatsAppInstanceEntity | null> {
      const instance = instancesById.get(instanceId);
      if (!instance || instance.tenantId !== tenantId) {
        return null;
      }
      return instance;
    },

    async findActiveByTenant(tenantId: string): Promise<readonly WhatsAppInstanceEntity[]> {
      const results: WhatsAppInstanceEntity[] = [];
      for (const instance of instancesById.values()) {
        if (instance.tenantId === tenantId && instance.active) {
          results.push(instance);
        }
      }
      return results;
    },

    seedInstance(instance: WhatsAppInstanceEntity): void {
      instancesById.set(instance.id, instance);
    },
  } as WhatsAppInstanceRepositoryPort & {
    seedInstance: (instance: WhatsAppInstanceEntity) => void;
  };
}

/** Cria par de repositórios in-memory (session + instance) para uso em dev/test. */
export function createInMemoryWhatsAppRepositories(): InMemoryWhatsAppRepositories {
  return {
    sessionRepository: createInMemorySessionRepository(),
    instanceRepository: createInMemoryWhatsAppInstanceRepository(),
  };
}

export type { InMemoryWhatsAppRepositories };
