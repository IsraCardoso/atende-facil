/** Primeiro repositorio Drizzle do projeto. Persistencia real de flows em PostgreSQL com tenant isolation (RN-021). */
import { and, count, eq, flowsTable, isNull, type PostgresJsDatabase, type schema, sql } from "db";

import type { FlowEntity, FlowId, FlowStatus } from "../../domain/flow-types";
import { createFlowId } from "../../domain/flow-types";
import type { PaginatedResult } from "../../domain/ports/conversation-ports";
import type { FlowFilters, FlowRepositoryPort } from "../../domain/ports/flow-ports";

type FlowRow = typeof flowsTable.$inferSelect;

/** Postgres unique_violation (SQLSTATE 23505) — dispara quando o indice flows_one_active_per_tenant rejeita a 2a ativacao concorrente. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}

function mapRowToEntity(row: FlowRow): FlowEntity {
  return {
    id: createFlowId(row.id),
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    definition: (row.definition ?? {}) as Readonly<Record<string, unknown>>,
    status: row.status as FlowStatus,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export function createDrizzleFlowRepository(
  db: PostgresJsDatabase<typeof schema>,
): FlowRepositoryPort {
  return {
    async findById(tenantId: string, flowId: FlowId): Promise<FlowEntity | null> {
      const rows = await db
        .select()
        .from(flowsTable)
        .where(
          and(
            eq(flowsTable.id, flowId),
            eq(flowsTable.tenantId, tenantId),
            isNull(flowsTable.deletedAt),
          ),
        )
        .limit(1);

      const row = rows[0];
      if (!row) {
        return null;
      }

      return mapRowToEntity(row);
    },

    async findActiveByTenant(tenantId: string): Promise<FlowEntity | null> {
      const rows = await db
        .select()
        .from(flowsTable)
        .where(
          and(
            eq(flowsTable.tenantId, tenantId),
            eq(flowsTable.status, "active"),
            isNull(flowsTable.deletedAt),
          ),
        )
        .limit(1);

      const row = rows[0];
      if (!row) {
        return null;
      }

      return mapRowToEntity(row);
    },

    async findByTenantPaginated(
      tenantId: string,
      filters: FlowFilters,
    ): Promise<PaginatedResult<FlowEntity>> {
      const { page, limit, status } = filters;
      const offset = (page - 1) * limit;

      const conditions = [eq(flowsTable.tenantId, tenantId), isNull(flowsTable.deletedAt)];
      if (status) {
        conditions.push(eq(flowsTable.status, status));
      }

      const whereClause = and(...conditions);

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(flowsTable)
          .where(whereClause)
          .orderBy(sql`${flowsTable.updatedAt} DESC`)
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(flowsTable).where(whereClause),
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

    async save(flow: FlowEntity): Promise<FlowEntity> {
      // RN-021: apenas um flow ativo por tenant
      if (flow.status === "active") {
        const existing = await db
          .select({ id: flowsTable.id })
          .from(flowsTable)
          .where(
            and(
              eq(flowsTable.tenantId, flow.tenantId),
              eq(flowsTable.status, "active"),
              isNull(flowsTable.deletedAt),
            ),
          )
          .limit(1);

        if (existing[0] && existing[0].id !== flow.id) {
          throw new Error("RN-021: já existe um flow ativo para este tenant.");
        }
      }

      const rows = await db
        .insert(flowsTable)
        .values({
          id: flow.id,
          tenantId: flow.tenantId,
          name: flow.name,
          description: flow.description,
          definition: flow.definition as Record<string, unknown>,
          status: flow.status,
          version: flow.version,
          createdAt: flow.createdAt,
          updatedAt: flow.updatedAt,
          deletedAt: flow.deletedAt,
        })
        .onConflictDoUpdate({
          target: flowsTable.id,
          set: {
            name: flow.name,
            description: flow.description,
            definition: flow.definition as Record<string, unknown>,
            status: flow.status,
            version: flow.version,
            updatedAt: new Date(),
          },
        })
        .returning();

      const row = rows[0];
      if (!row) {
        throw new Error("Falha ao salvar flow: nenhuma linha retornada.");
      }

      return mapRowToEntity(row);
    },

    async updateStatus(
      tenantId: string,
      flowId: FlowId,
      status: FlowStatus,
      deletedAt?: Date | null,
    ): Promise<FlowEntity> {
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
      };

      if (deletedAt !== undefined) {
        updateData.deletedAt = deletedAt;
      }

      const rows = await db
        .update(flowsTable)
        .set(updateData)
        .where(and(eq(flowsTable.id, flowId), eq(flowsTable.tenantId, tenantId)))
        .returning();

      const row = rows[0];
      if (!row) {
        throw new Error("Falha ao atualizar status do flow: registro nao encontrado.");
      }

      return mapRowToEntity(row);
    },

    async activateExclusive(tenantId: string, flowId: FlowId) {
      try {
        return await db.transaction(async (tx) => {
          const lockedActiveRows = await tx
            .select()
            .from(flowsTable)
            .where(
              and(
                eq(flowsTable.tenantId, tenantId),
                eq(flowsTable.status, "active"),
                isNull(flowsTable.deletedAt),
              ),
            )
            .for("update");

          const currentActive = lockedActiveRows[0];
          let previousActiveFlow: FlowEntity | null = null;

          if (currentActive && currentActive.id !== flowId) {
            const demoted = await tx
              .update(flowsTable)
              .set({ status: "published", updatedAt: new Date() })
              .where(and(eq(flowsTable.id, currentActive.id), eq(flowsTable.tenantId, tenantId)))
              .returning();

            const demotedRow = demoted[0];
            if (!demotedRow) {
              throw new Error("Falha ao desativar flow anterior: registro nao encontrado.");
            }
            previousActiveFlow = mapRowToEntity(demotedRow);
          }

          // isNull(deletedAt): sem essa guarda, um softDelete concorrente no meio da troca
          // ativaria uma linha ja soft-deletada — "ghost row" invisivel pra findById/findActiveByTenant
          // (que filtram isNull(deletedAt)) e fora do alcance do indice unico (que so cobre deletedAt IS NULL).
          const activatedRows = await tx
            .update(flowsTable)
            .set({ status: "active", updatedAt: new Date() })
            .where(
              and(
                eq(flowsTable.id, flowId),
                eq(flowsTable.tenantId, tenantId),
                isNull(flowsTable.deletedAt),
              ),
            )
            .returning();

          const activatedRow = activatedRows[0];
          if (!activatedRow) {
            return { ok: false, reason: "ACTIVATION_CONFLICT" } as const;
          }

          return {
            ok: true,
            activated: mapRowToEntity(activatedRow),
            previousActiveFlow,
          } as const;
        });
      } catch (error: unknown) {
        if (isUniqueViolation(error)) {
          return { ok: false, reason: "ACTIVATION_CONFLICT" } as const;
        }
        throw error;
      }
    },

    async softDelete(tenantId: string, flowId: FlowId): Promise<void> {
      await db
        .update(flowsTable)
        .set({
          status: "archived",
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(flowsTable.id, flowId), eq(flowsTable.tenantId, tenantId)));
    },
  };
}
