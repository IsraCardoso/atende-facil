/** Lista tenants com schedules ativos para o cron do worker (RN-027). */
import {
  createDatabaseConnection,
  createDatabaseUrl,
  eq,
  flowSchedulesTable,
  type PostgresJsDatabase,
  type schema,
} from "db";

type ScheduleStore = Readonly<{
  findTenantIdsWithActiveSchedules: () => Promise<readonly string[]>;
}>;

function createDrizzleScheduleStore(db: PostgresJsDatabase<typeof schema>): ScheduleStore {
  return {
    async findTenantIdsWithActiveSchedules(): Promise<readonly string[]> {
      const rows = await db
        .select({ tenantId: flowSchedulesTable.tenantId })
        .from(flowSchedulesTable)
        .where(eq(flowSchedulesTable.active, true));

      return [...new Set(rows.map((row) => row.tenantId))];
    },
  };
}

export function createScheduleStore(databaseUrl: string): ScheduleStore {
  const { db } = createDatabaseConnection(createDatabaseUrl(databaseUrl));
  return createDrizzleScheduleStore(db);
}

export type { ScheduleStore };
