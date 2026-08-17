/** Repositorio Drizzle de conversations. Persistencia real com isolamento multi-tenant (RN-024). */
import { and, conversationsTable, count, eq, type PostgresJsDatabase, type schema, sql } from "db";

import type {
  ConversationEntity,
  ConversationId,
  ConversationStatus,
} from "../../domain/conversation-types";
import { createConversationId } from "../../domain/conversation-types";
import type {
  ChatwootConversationScope,
  ConversationFilters,
  ConversationRepositoryPort,
  PaginatedResult,
} from "../../domain/ports/conversation-ports";
import type { ChatwootConversationId, SessionId } from "../../domain/whatsapp-types";
import {
  createChatwootConversationId,
  createPhone,
  createSessionId,
} from "../../domain/whatsapp-types";

type ConversationRow = typeof conversationsTable.$inferSelect;

function mapRowToEntity(row: ConversationRow): ConversationEntity {
  return {
    id: createConversationId(row.id),
    tenantId: row.tenantId,
    sessionId: createSessionId(row.sessionId),
    phone: createPhone(row.phone),
    status: row.status as ConversationStatus,
    assignedTo: row.assignedTo,
    chatwootConversationId: row.chatwootConversationId
      ? createChatwootConversationId(row.chatwootConversationId)
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createDrizzleConversationRepository(
  db: PostgresJsDatabase<typeof schema>,
): ConversationRepositoryPort {
  return {
    async findById(
      tenantId: string,
      conversationId: ConversationId,
    ): Promise<ConversationEntity | null> {
      const rows = await db
        .select()
        .from(conversationsTable)
        .where(
          and(eq(conversationsTable.id, conversationId), eq(conversationsTable.tenantId, tenantId)),
        )
        .limit(1);

      const row = rows[0];
      return row ? mapRowToEntity(row) : null;
    },

    async findBySessionId(
      tenantId: string,
      sessionId: SessionId,
    ): Promise<ConversationEntity | null> {
      const rows = await db
        .select()
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.sessionId, sessionId),
            eq(conversationsTable.tenantId, tenantId),
          ),
        )
        .limit(1);

      const row = rows[0];
      return row ? mapRowToEntity(row) : null;
    },

    async findByChatwootConversationId(
      chatwootConversationId: ChatwootConversationId,
      scope?: ChatwootConversationScope,
    ): Promise<ConversationEntity | null> {
      const conditions = [eq(conversationsTable.chatwootConversationId, chatwootConversationId)];

      if (scope?.tenantId) {
        conditions.push(eq(conversationsTable.tenantId, scope.tenantId));
      }

      if (scope?.phone) {
        conditions.push(eq(conversationsTable.phone, scope.phone));
      }

      const rows = await db
        .select()
        .from(conversationsTable)
        .where(and(...conditions))
        .limit(1);

      const row = rows[0];
      return row ? mapRowToEntity(row) : null;
    },

    async findByTenantAndStatus(
      tenantId: string,
      status: ConversationStatus,
    ): Promise<readonly ConversationEntity[]> {
      const rows = await db
        .select()
        .from(conversationsTable)
        .where(
          and(eq(conversationsTable.tenantId, tenantId), eq(conversationsTable.status, status)),
        );

      return rows.map(mapRowToEntity);
    },

    async findByTenantPaginated(
      tenantId: string,
      filters: ConversationFilters,
    ): Promise<PaginatedResult<ConversationEntity>> {
      const { page, limit, status } = filters;
      const offset = (page - 1) * limit;

      const conditions = [eq(conversationsTable.tenantId, tenantId)];
      if (status) {
        conditions.push(eq(conversationsTable.status, status));
      }

      const whereClause = and(...conditions);

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(conversationsTable)
          .where(whereClause)
          .orderBy(sql`${conversationsTable.updatedAt} DESC`)
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(conversationsTable).where(whereClause),
      ]);

      const total = totalResult[0]?.total ?? 0;

      return {
        data: rows.map(mapRowToEntity),
        total,
        page,
        limit,
        hasMore: offset + rows.length < total,
      };
    },

    async save(conversation: ConversationEntity): Promise<ConversationEntity> {
      const rows = await db
        .insert(conversationsTable)
        .values({
          id: conversation.id,
          tenantId: conversation.tenantId,
          sessionId: conversation.sessionId,
          phone: conversation.phone,
          status: conversation.status,
          assignedTo: conversation.assignedTo,
          chatwootConversationId: conversation.chatwootConversationId,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        })
        .onConflictDoUpdate({
          target: conversationsTable.id,
          set: {
            status: conversation.status,
            assignedTo: conversation.assignedTo,
            chatwootConversationId: conversation.chatwootConversationId,
            updatedAt: new Date(),
          },
        })
        .returning();

      const row = rows[0];
      if (!row) {
        throw new Error("Falha ao salvar conversation: nenhuma linha retornada.");
      }
      return mapRowToEntity(row);
    },

    async updateStatus(
      tenantId: string,
      conversationId: ConversationId,
      status: ConversationStatus,
      assignedTo?: string | null,
    ): Promise<void> {
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
      };
      if (assignedTo !== undefined) {
        updateData.assignedTo = assignedTo;
      }

      await db
        .update(conversationsTable)
        .set(updateData)
        .where(
          and(eq(conversationsTable.id, conversationId), eq(conversationsTable.tenantId, tenantId)),
        );
    },
  };
}
