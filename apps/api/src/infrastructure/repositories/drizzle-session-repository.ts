/** Repositorio Drizzle de sessions. Persistencia real com upsert em (tenant_id, phone) (RN-024). */
import { and, eq, type PostgresJsDatabase, type schema, sessionsTable } from "db";

import type { SessionRepositoryPort } from "../../domain/ports/whatsapp-ports";
import type { Phone, SessionEntity, SessionId, SessionMode } from "../../domain/whatsapp-types";
import { createPhone, createSessionId } from "../../domain/whatsapp-types";

type SessionRow = typeof sessionsTable.$inferSelect;

function mapRowToEntity(row: SessionRow): SessionEntity {
  return {
    id: createSessionId(row.id),
    tenantId: row.tenantId,
    phone: createPhone(row.phone),
    currentNodeId: row.currentNodeId,
    mode: row.mode as SessionMode,
    data: (row.data ?? {}) as Readonly<Record<string, unknown>>,
    flowId: row.flowId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createDrizzleSessionRepository(
  db: PostgresJsDatabase<typeof schema>,
): SessionRepositoryPort {
  return {
    async findByTenantAndPhone(tenantId: string, phone: Phone): Promise<SessionEntity | null> {
      const rows = await db
        .select()
        .from(sessionsTable)
        .where(and(eq(sessionsTable.tenantId, tenantId), eq(sessionsTable.phone, phone)))
        .limit(1);

      const row = rows[0];
      return row ? mapRowToEntity(row) : null;
    },

    async save(session: SessionEntity): Promise<SessionEntity> {
      const rows = await db
        .insert(sessionsTable)
        .values({
          id: session.id,
          tenantId: session.tenantId,
          phone: session.phone,
          currentNodeId: session.currentNodeId,
          mode: session.mode,
          data: session.data as Record<string, unknown>,
          flowId: session.flowId,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        })
        .onConflictDoUpdate({
          target: sessionsTable.id,
          set: {
            currentNodeId: session.currentNodeId,
            mode: session.mode,
            data: session.data as Record<string, unknown>,
            flowId: session.flowId,
            updatedAt: new Date(),
          },
        })
        .returning();

      const row = rows[0];
      if (!row) {
        throw new Error("Falha ao salvar session: nenhuma linha retornada.");
      }
      return mapRowToEntity(row);
    },

    async updateMode(tenantId: string, sessionId: SessionId, mode: SessionMode): Promise<void> {
      await db
        .update(sessionsTable)
        .set({ mode, updatedAt: new Date() })
        .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.tenantId, tenantId)));
    },
  };
}
