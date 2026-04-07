/** Schema Drizzle da tabela flow_schedules. Define faixas de horario/dia para ativacao automatica de fluxos por tenant (RN-027). */
import { boolean, index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { flowsTable } from "./flows";
import { tenantsTable } from "./tenants";

export const flowSchedulesTable = pgTable(
  "flow_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    flowId: uuid("flow_id")
      .notNull()
      .references(() => flowsTable.id, { onDelete: "cascade" }),
    daysOfWeek: integer("days_of_week").array().notNull(),
    startTime: varchar("start_time", { length: 5 }).notNull(),
    endTime: varchar("end_time", { length: 5 }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("flow_schedules_tenant_id_idx").on(table.tenantId),
    index("flow_schedules_tenant_active_idx").on(table.tenantId, table.active),
  ],
);

export type FlowScheduleRow = typeof flowSchedulesTable.$inferSelect;
export type NewFlowScheduleRow = typeof flowSchedulesTable.$inferInsert;
