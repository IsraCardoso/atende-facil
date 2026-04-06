/** Schema Drizzle da tabela sessions. Unique em (tenant_id, phone), indexada por mode e tenant_id. */
import { index, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { tenantsTable } from "./tenants";

export const sessionsTable = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 32 }).notNull(),
    currentNodeId: varchar("current_node_id", { length: 255 }),
    mode: varchar("mode", { length: 32 }).default("bot").notNull(),
    data: jsonb("data").default({}).notNull(),
    flowId: uuid("flow_id"),
    chatwootConversationId: varchar("chatwoot_conversation_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sessions_tenant_phone_unique").on(table.tenantId, table.phone),
    index("sessions_tenant_id_idx").on(table.tenantId),
    index("sessions_phone_idx").on(table.phone),
    index("sessions_mode_idx").on(table.mode),
  ],
);

export type Session = typeof sessionsTable.$inferSelect;
export type NewSession = typeof sessionsTable.$inferInsert;
