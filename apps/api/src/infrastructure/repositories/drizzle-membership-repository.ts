/** Repositorio Drizzle de tenant_memberships. Vinculo usuario-tenant com role e status (RN-024). */
import { and, eq, type PostgresJsDatabase, type schema, tenantMembershipsTable } from "db";

import {
  createTenantMembershipEntity,
  type TenantMembershipEntity,
} from "../../domain/auth-entities";
import type {
  MembershipStatus,
  TenantId,
  TenantMembershipId,
  UserId,
} from "../../domain/auth-types";
import type {
  MembershipRepositoryPort,
  RemoveIfNotLastAdminResult,
  UpdateStatusIfNotLastAdminResult,
} from "../../domain/ports";

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

    async listByTenant(tenantId: TenantId): Promise<readonly TenantMembershipEntity[]> {
      const rows = await db
        .select()
        .from(tenantMembershipsTable)
        .where(eq(tenantMembershipsTable.tenantId, tenantId));

      return rows.map(mapRowToEntity);
    },

    async updateStatusIfNotLastAdmin(
      tenantId: TenantId,
      membershipId: TenantMembershipId,
      status: MembershipStatus,
    ): Promise<UpdateStatusIfNotLastAdminResult> {
      return db.transaction(async (tx) => {
        const lockedActiveAdmins = await tx
          .select()
          .from(tenantMembershipsTable)
          .where(
            and(
              eq(tenantMembershipsTable.tenantId, tenantId),
              eq(tenantMembershipsTable.role, "admin"),
              eq(tenantMembershipsTable.status, "active"),
            ),
          )
          .for("update");

        const isGuardedTarget = lockedActiveAdmins.some((row) => row.id === membershipId);
        if (isGuardedTarget && lockedActiveAdmins.length <= 1) {
          return { ok: false, reason: "LAST_ADMIN" };
        }

        const updated = await tx
          .update(tenantMembershipsTable)
          .set({ status, updatedAt: new Date() })
          .where(
            and(
              eq(tenantMembershipsTable.id, membershipId),
              eq(tenantMembershipsTable.tenantId, tenantId),
            ),
          )
          .returning();

        const row = updated[0];
        if (!row) {
          throw new Error("Falha ao atualizar status do membership: registro nao encontrado.");
        }

        return { ok: true, membership: mapRowToEntity(row) };
      });
    },

    async removeIfNotLastAdmin(
      tenantId: TenantId,
      userId: UserId,
    ): Promise<RemoveIfNotLastAdminResult> {
      return db.transaction(async (tx) => {
        const lockedActiveAdmins = await tx
          .select()
          .from(tenantMembershipsTable)
          .where(
            and(
              eq(tenantMembershipsTable.tenantId, tenantId),
              eq(tenantMembershipsTable.role, "admin"),
              eq(tenantMembershipsTable.status, "active"),
            ),
          )
          .for("update");

        const isGuardedTarget = lockedActiveAdmins.some((row) => row.userId === userId);
        if (isGuardedTarget && lockedActiveAdmins.length <= 1) {
          return { ok: false, reason: "LAST_ADMIN" };
        }

        await tx
          .delete(tenantMembershipsTable)
          .where(
            and(
              eq(tenantMembershipsTable.tenantId, tenantId),
              eq(tenantMembershipsTable.userId, userId),
            ),
          );

        return { ok: true };
      });
    },
  };
}
