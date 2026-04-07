/** Repositorio Drizzle de tenant_integrations. Config per-tenant para integracoes externas (RN-026). */
import { and, eq, type PostgresJsDatabase, type schema, tenantIntegrationsTable } from "db";

import type { IntegrationProvider, TenantIntegrationEntity } from "../../domain/integration-types";
import { createTenantIntegrationId } from "../../domain/integration-types";
import type { TenantIntegrationRepositoryPort } from "../../domain/ports/integration-ports";

type IntegrationRow = typeof tenantIntegrationsTable.$inferSelect;

function mapRowToEntity(row: IntegrationRow): TenantIntegrationEntity {
  return {
    id: createTenantIntegrationId(row.id),
    tenantId: row.tenantId,
    provider: row.provider as IntegrationProvider,
    config: (row.config ?? {}) as Readonly<Record<string, unknown>>,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createDrizzleTenantIntegrationRepository(
  db: PostgresJsDatabase<typeof schema>,
): TenantIntegrationRepositoryPort {
  return {
    async findByTenantAndProvider(
      tenantId: string,
      provider: IntegrationProvider,
    ): Promise<TenantIntegrationEntity | null> {
      const rows = await db
        .select()
        .from(tenantIntegrationsTable)
        .where(
          and(
            eq(tenantIntegrationsTable.tenantId, tenantId),
            eq(tenantIntegrationsTable.provider, provider),
            eq(tenantIntegrationsTable.isActive, true),
          ),
        )
        .limit(1);

      const row = rows[0];
      return row ? mapRowToEntity(row) : null;
    },

    async save(entity: TenantIntegrationEntity): Promise<TenantIntegrationEntity> {
      const rows = await db
        .insert(tenantIntegrationsTable)
        .values({
          id: entity.id,
          tenantId: entity.tenantId,
          provider: entity.provider,
          config: entity.config as Record<string, unknown>,
          isActive: entity.isActive,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        })
        .onConflictDoUpdate({
          target: tenantIntegrationsTable.id,
          set: {
            config: entity.config as Record<string, unknown>,
            isActive: entity.isActive,
            updatedAt: new Date(),
          },
        })
        .returning();

      const row = rows[0];
      if (!row) {
        throw new Error("Falha ao salvar tenant_integration: nenhuma linha retornada.");
      }
      return mapRowToEntity(row);
    },
  };
}
