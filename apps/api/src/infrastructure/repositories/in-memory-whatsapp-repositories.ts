/** Repositórios in-memory para sessões e instâncias WhatsApp. Usados em dev/test; produção usará Drizzle. */
import type {
  SessionRepositoryPort,
  WhatsAppInstanceRepositoryPort,
} from "../../domain/ports/whatsapp-ports";
import type {
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

    async updateMode(tenantId: string, sessionId: SessionId, mode: SessionMode): Promise<void> {
      const existing = sessionsById.get(sessionId);
      if (!existing || existing.tenantId !== tenantId) {
        return;
      }

      const updated: SessionEntity = {
        ...existing,
        mode,
        updatedAt: new Date(),
      };
      sessionsById.set(sessionId, updated);
    },
  };
}

function createInMemoryWhatsAppInstanceRepository(): WhatsAppInstanceRepositoryPort {
  const instancesById = new Map<string, WhatsAppInstanceEntity>();

  const repository: WhatsAppInstanceRepositoryPort & {
    seedInstance: (instance: WhatsAppInstanceEntity) => void;
  } = {
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

    async listByTenant(tenantId: string): Promise<readonly WhatsAppInstanceEntity[]> {
      return [...instancesById.values()].filter((instance) => instance.tenantId === tenantId);
    },

    async save(instance: WhatsAppInstanceEntity): Promise<WhatsAppInstanceEntity> {
      const saved: WhatsAppInstanceEntity = {
        ...instance,
        updatedAt: new Date(),
      };
      instancesById.set(instance.id, saved);
      return saved;
    },

    async setPrimary(tenantId: string, instanceId: WhatsAppInstanceId): Promise<void> {
      for (const [id, instance] of instancesById.entries()) {
        if (instance.tenantId !== tenantId) {
          continue;
        }
        instancesById.set(id, {
          ...instance,
          isPrimary: id === instanceId,
          active: id === instanceId ? true : instance.active,
          updatedAt: new Date(),
        });
      }
    },

    async deleteByTenantAndId(tenantId: string, instanceId: WhatsAppInstanceId): Promise<void> {
      const instance = instancesById.get(instanceId);
      if (instance?.tenantId === tenantId) {
        instancesById.delete(instanceId);
      }
    },

    seedInstance(instance: WhatsAppInstanceEntity): void {
      instancesById.set(instance.id, instance);
    },
  };

  return repository;
}

/** Cria par de repositórios in-memory (session + instance) para uso em dev/test. */
export function createInMemoryWhatsAppRepositories(): InMemoryWhatsAppRepositories {
  return {
    sessionRepository: createInMemorySessionRepository(),
    instanceRepository: createInMemoryWhatsAppInstanceRepository(),
  };
}

export type { InMemoryWhatsAppRepositories };
