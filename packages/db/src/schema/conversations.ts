/** Schema Drizzle da tabela conversations. Ciclo de atendimento humano, separada de sessions (RN-014). */
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { sessionsTable } from "./sessions";
import { tenantsTable } from "./tenants";

export const conversationsTable = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessionsTable.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).default("bot").notNull(),
    assignedTo: uuid("assigned_to"),
    chatwootConversationId: varchar("chatwoot_conversation_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("conversations_tenant_session_unique").on(table.tenantId, table.sessionId),
    index("conversations_tenant_id_idx").on(table.tenantId),
    index("conversations_session_id_idx").on(table.sessionId),
    index("conversations_phone_idx").on(table.phone),
    index("conversations_status_idx").on(table.status),
  ],
);

export type Conversation = typeof conversationsTable.$inferSelect;
export type NewConversation = typeof conversationsTable.$inferInsert;
