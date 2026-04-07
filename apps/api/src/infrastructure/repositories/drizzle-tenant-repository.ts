/** Repositorio Drizzle de tenants. Persistencia real em PostgreSQL (RN-024). */
import { eq, type PostgresJsDatabase, type schema, tenantsTable } from "db";

import { createTenantEntity, type TenantEntity } from "../../domain/auth-entities";
import type { TenantId, TenantSlug } from "../../domain/auth-types";
import type { TenantRepositoryPort } from "../../domain/ports";

type TenantRow = typeof tenantsTable.$inferSelect;

function mapRowToEntity(row: TenantRow): TenantEntity {
  return createTenantEntity({
    id: row.id as TenantId,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function createDrizzleTenantRepository(
  db: PostgresJsDatabase<typeof schema>,
): TenantRepositoryPort {
  return {
    async create(tenant: TenantEntity): Promise<TenantEntity> {
      const rows = await db
        .insert(tenantsTable)
        .values({
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt,
        })
        .returning();

      const row = rows[0];
      if (!row) {
        throw new Error("Falha ao criar tenant: nenhuma linha retornada.");
      }

      return mapRowToEntity(row);
    },

    async findById(tenantId: TenantId): Promise<TenantEntity | null> {
      const rows = await db
        .select()
        .from(tenantsTable)
        .where(eq(tenantsTable.id, tenantId))
        .limit(1);

      const row = rows[0];
      return row ? mapRowToEntity(row) : null;
    },

    async findBySlug(slug: TenantSlug): Promise<TenantEntity | null> {
      const rows = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, slug)).limit(1);

      const row = rows[0];
      return row ? mapRowToEntity(row) : null;
    },
  };
}
