/** Schema Drizzle da tabela flows. Armazena definicoes de fluxo conversacional com ciclo de vida por tenant (RN-021). */

import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { tenantsTable } from "./tenants";

export const flowsTable = pgTable(
  "flows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    definition: jsonb("definition").default({}).notNull(),
    status: varchar("status", { length: 20 }).default("draft").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("flows_tenant_id_idx").on(table.tenantId),
    index("flows_tenant_status_idx").on(table.tenantId, table.status),
  ],
);

export type FlowRow = typeof flowsTable.$inferSelect;
export type NewFlowRow = typeof flowsTable.$inferInsert;
