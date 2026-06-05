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
    displayName: row.displayName ?? null,
    config: (row.config ?? {}) as Readonly<Record<string, unknown>>,
    active: row.active,
    isPrimary: row.isPrimary,
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

    async listByTenant(tenantId: string): Promise<readonly WhatsAppInstanceEntity[]> {
      const rows = await db
        .select()
        .from(whatsappInstancesTable)
        .where(eq(whatsappInstancesTable.tenantId, tenantId));

      return rows.map(mapRowToEntity);
    },

    async save(instance: WhatsAppInstanceEntity): Promise<WhatsAppInstanceEntity> {
      const now = new Date();
      const rows = await db
        .insert(whatsappInstancesTable)
        .values({
          id: instance.id,
          tenantId: instance.tenantId,
          provider: instance.provider,
          displayName: instance.displayName,
          config: { ...instance.config },
          active: instance.active,
          isPrimary: instance.isPrimary,
          createdAt: instance.createdAt ?? now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: whatsappInstancesTable.id,
          set: {
            provider: instance.provider,
            displayName: instance.displayName,
            config: { ...instance.config },
            active: instance.active,
            isPrimary: instance.isPrimary,
            updatedAt: now,
          },
        })
        .returning();

      const row = rows[0];
      if (!row) {
        throw new Error("WHATSAPP_INSTANCE_SAVE_FAILED");
      }

      return mapRowToEntity(row);
    },

    async setPrimary(tenantId: string, instanceId: WhatsAppInstanceId): Promise<void> {
      await db
        .update(whatsappInstancesTable)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(whatsappInstancesTable.tenantId, tenantId));

      await db
        .update(whatsappInstancesTable)
        .set({ isPrimary: true, active: true, updatedAt: new Date() })
        .where(
          and(
            eq(whatsappInstancesTable.tenantId, tenantId),
            eq(whatsappInstancesTable.id, instanceId),
          ),
        );
    },

    async deleteByTenantAndId(tenantId: string, instanceId: WhatsAppInstanceId): Promise<void> {
      await db
        .delete(whatsappInstancesTable)
        .where(
          and(
            eq(whatsappInstancesTable.tenantId, tenantId),
            eq(whatsappInstancesTable.id, instanceId),
          ),
        );
    },
  };
}
