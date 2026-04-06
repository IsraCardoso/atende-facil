import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const tenantsTable = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Tenant = typeof tenantsTable.$inferSelect;
export type NewTenant = typeof tenantsTable.$inferInsert;
