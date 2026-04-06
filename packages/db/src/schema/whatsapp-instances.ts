/** Schema Drizzle da tabela whatsapp_instances. Armazena config de cada provider em JSONB por tenant. */
import { boolean, index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { tenantsTable } from "./tenants";

export const whatsappInstancesTable = pgTable(
  "whatsapp_instances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    config: jsonb("config").default({}).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("whatsapp_instances_tenant_id_idx").on(table.tenantId),
    index("whatsapp_instances_provider_idx").on(table.provider),
  ],
);

export type WhatsAppInstance = typeof whatsappInstancesTable.$inferSelect;
export type NewWhatsAppInstance = typeof whatsappInstancesTable.$inferInsert;
