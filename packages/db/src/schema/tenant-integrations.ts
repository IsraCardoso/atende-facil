/** Schema Drizzle da tabela tenant_integrations. Config per-tenant para integrações externas (Chatwoot, etc). */
import {
  boolean,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { tenantsTable } from "./tenants";

export const tenantIntegrationsTable = pgTable(
  "tenant_integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 64 }).notNull(),
    config: jsonb("config").default({}).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("tenant_integrations_tenant_provider_unique").on(table.tenantId, table.provider),
    index("tenant_integrations_tenant_id_idx").on(table.tenantId),
    index("tenant_integrations_provider_idx").on(table.provider),
  ],
);

export type TenantIntegration = typeof tenantIntegrationsTable.$inferSelect;
export type NewTenantIntegration = typeof tenantIntegrationsTable.$inferInsert;
