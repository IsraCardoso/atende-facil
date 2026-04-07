/** Repositorio Drizzle de whatsapp_instances. Lookup de instancias por tenant (RN-024). */
import { and, eq, type PostgresJsDatabase, type schema, whatsappInstancesTable } from "db";
import type { WhatsAppInstanceRepositoryPort } from "../../domain/ports/whatsapp-ports";
import type {
  WhatsAppInstanceEntity,
  WhatsAppInstanceId,
  WhatsAppProvider,
} from "../../domain/whatsapp-types";
import { createWhatsAppInstanceId } from "../../domain/whatsapp-types";

type InstanceRow = typeof whatsappInstancesTable.$inferSelect;

function mapRowToEntity(row: InstanceRow): WhatsAppInstanceEntity {
  return {
    id: createWhatsAppInstanceId(row.id),
    tenantId: row.tenantId,
    provider: row.provider as WhatsAppProvider,
    config: (row.config ?? {}) as Readonly<Record<string, unknown>>,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createDrizzleWhatsAppInstanceRepository(
  db: PostgresJsDatabase<typeof schema>,
): WhatsAppInstanceRepositoryPort {
  return {
    async findByTenantAndId(
      tenantId: string,
      instanceId: WhatsAppInstanceId,
    ): Promise<WhatsAppInstanceEntity | null> {
      const rows = await db
        .select()
        .from(whatsappInstancesTable)
        .where(
          and(
            eq(whatsappInstancesTable.tenantId, tenantId),
            eq(whatsappInstancesTable.id, instanceId),
          ),
        )
        .limit(1);

      const row = rows[0];
      return row ? mapRowToEntity(row) : null;
    },

    async findActiveByTenant(tenantId: string): Promise<readonly WhatsAppInstanceEntity[]> {
      const rows = await db
        .select()
        .from(whatsappInstancesTable)
        .where(
          and(
            eq(whatsappInstancesTable.tenantId, tenantId),
            eq(whatsappInstancesTable.active, true),
          ),
        );

      return rows.map(mapRowToEntity);
    },
  };
}
