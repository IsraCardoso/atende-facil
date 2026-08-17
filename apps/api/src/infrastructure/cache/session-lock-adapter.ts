/** Adapters de lock distribuído de sessão. Garante serialização de mensagens concorrentes do mesmo contato (RN-012). */
import type { CachePort } from "../../domain/ports/auth-ports";
import type { SessionLockPort } from "../../domain/ports/whatsapp-ports";
import type { Phone } from "../../domain/whatsapp-types";

const LOCK_NAMESPACE = "session-lock";

function createLockKey(tenantId: string, phone: Phone): string {
  return `${LOCK_NAMESPACE}:${tenantId}:${phone}`;
}

function generateLockToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Lock via Valkey (CachePort). Usa token exclusivo para garantir que apenas o dono libere o lock. */
export function createValkeySessionLockAdapter(cachePort: CachePort): SessionLockPort {
  const ownedTokens = new Map<string, string>();

  return {
    async acquire(tenantId: string, phone: Phone, ttlMs: number): Promise<boolean> {
      const key = createLockKey(tenantId, phone);
      const existing = await cachePort.get<string>(key);

      if (existing) {
        return false;
      }

      const token = generateLockToken();
      const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
      await cachePort.set({ key, value: token, ttlSeconds });
      ownedTokens.set(key, token);
      return true;
    },

    async release(tenantId: string, phone: Phone): Promise<void> {
      const key = createLockKey(tenantId, phone);
      const ownedToken = ownedTokens.get(key);

      if (!ownedToken) {
        return;
      }

      const currentToken = await cachePort.get<string>(key);
      if (currentToken === ownedToken) {
        await cachePort.delete(key);
      }
      ownedTokens.delete(key);
    },
  };
}

/** Lock in-memory para dev/test. Respeita TTL via timestamp. */
export function createInMemorySessionLockAdapter(): SessionLockPort {
  const locks = new Map<string, { token: string; expiresAt: number }>();

  return {
    async acquire(tenantId: string, phone: Phone, ttlMs: number): Promise<boolean> {
      const key = createLockKey(tenantId, phone);
      const existing = locks.get(key);

      if (existing && existing.expiresAt > Date.now()) {
        return false;
      }

      const token = generateLockToken();
      locks.set(key, { token, expiresAt: Date.now() + ttlMs });
      return true;
    },

    async release(tenantId: string, phone: Phone): Promise<void> {
      const key = createLockKey(tenantId, phone);
      locks.delete(key);
    },
  };
}
