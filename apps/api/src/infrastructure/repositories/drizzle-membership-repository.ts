/** Repositorio Drizzle de tenant_memberships. Vinculo usuario-tenant com role e status (RN-024). */
import { and, eq, type PostgresJsDatabase, type schema, tenantMembershipsTable } from "db";

import {
  createTenantMembershipEntity,
  type TenantMembershipEntity,
} from "../../domain/auth-entities";
import type { TenantId, TenantMembershipId, UserId } from "../../domain/auth-types";
import type { MembershipRepositoryPort } from "../../domain/ports";

type MembershipRow = typeof tenantMembershipsTable.$inferSelect;

function mapRowToEntity(row: MembershipRow): TenantMembershipEntity {
  return createTenantMembershipEntity({
    id: row.id as TenantMembershipId,
    tenantId: row.tenantId as TenantId,
    userId: row.userId as UserId,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function createDrizzleMembershipRepository(
  db: PostgresJsDatabase<typeof schema>,
): MembershipRepositoryPort {
  return {
    async create(membership: TenantMembershipEntity): Promise<TenantMembershipEntity> {
      const rows = await db
        .insert(tenantMembershipsTable)
        .values({
          id: membership.id,
          tenantId: membership.tenantId,
          userId: membership.userId,
          role: membership.role,
          status: membership.status,
          createdAt: membership.createdAt,
          updatedAt: membership.updatedAt,
        })
        .returning();

      const row = rows[0];
      if (!row) {
        throw new Error("Falha ao criar membership: nenhuma linha retornada.");
      }

      return mapRowToEntity(row);
    },

    async findByUserAndTenant(
      userId: UserId,
      tenantId: TenantId,
    ): Promise<TenantMembershipEntity | null> {
      const rows = await db
        .select()
        .from(tenantMembershipsTable)
        .where(
          and(
            eq(tenantMembershipsTable.userId, userId),
            eq(tenantMembershipsTable.tenantId, tenantId),
          ),
        )
        .limit(1);

      const row = rows[0];
      return row ? mapRowToEntity(row) : null;
    },

    async listByUserId(userId: UserId): Promise<readonly TenantMembershipEntity[]> {
      const rows = await db
        .select()
        .from(tenantMembershipsTable)
        .where(eq(tenantMembershipsTable.userId, userId));

      return rows.map(mapRowToEntity);
    },
  };
}
