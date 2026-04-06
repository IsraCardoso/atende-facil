/** Schema Drizzle da tabela tenant_memberships. Relaciona usuários a tenants com role e status. */
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { tenantsTable } from "./tenants";
import { usersTable } from "./users";

export const tenantMembershipsTable = pgTable(
  "tenant_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("tenant_memberships_tenant_user_unique").on(table.tenantId, table.userId),
    index("tenant_memberships_tenant_id_idx").on(table.tenantId),
    index("tenant_memberships_user_id_idx").on(table.userId),
    index("tenant_memberships_role_idx").on(table.role),
  ],
);

export type TenantMembership = typeof tenantMembershipsTable.$inferSelect;
export type NewTenantMembership = typeof tenantMembershipsTable.$inferInsert;
