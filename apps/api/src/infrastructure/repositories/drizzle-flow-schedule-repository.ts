/** Repositorio Drizzle de flow schedules. Persistencia real em PostgreSQL com tenant isolation (RN-027). */
import { and, eq, flowSchedulesTable, type PostgresJsDatabase, type schema } from "db";
import type { FlowScheduleRepositoryPort } from "../../domain/ports/schedule-ports";
import {
  createDaysOfWeek,
  createFlowScheduleId,
  type DayOfWeek,
  type FlowScheduleEntity,
  type FlowScheduleId,
} from "../../domain/schedule-types";

function mapRowToEntity(row: typeof flowSchedulesTable.$inferSelect): FlowScheduleEntity {
  return {
    id: createFlowScheduleId(row.id),
    tenantId: row.tenantId,
    flowId: row.flowId,
    daysOfWeek: createDaysOfWeek(row.daysOfWeek),
    startTime: row.startTime,
    endTime: row.endTime,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createDrizzleFlowScheduleRepository(
  db: PostgresJsDatabase<typeof schema>,
): FlowScheduleRepositoryPort {
  return {
    async findActiveByTenant(tenantId: string): Promise<readonly FlowScheduleEntity[]> {
      const rows = await db
        .select()
        .from(flowSchedulesTable)
        .where(and(eq(flowSchedulesTable.tenantId, tenantId), eq(flowSchedulesTable.active, true)));
      return rows.map(mapRowToEntity);
    },

    async findById(
      tenantId: string,
      scheduleId: FlowScheduleId,
    ): Promise<FlowScheduleEntity | null> {
      const rows = await db
        .select()
        .from(flowSchedulesTable)
        .where(
          and(eq(flowSchedulesTable.id, scheduleId), eq(flowSchedulesTable.tenantId, tenantId)),
        )
        .limit(1);
      const row = rows[0];
      return row ? mapRowToEntity(row) : null;
    },

    async save(schedule: FlowScheduleEntity): Promise<FlowScheduleEntity> {
      const existing = await db
        .select()
        .from(flowSchedulesTable)
        .where(
          and(
            eq(flowSchedulesTable.id, schedule.id),
            eq(flowSchedulesTable.tenantId, schedule.tenantId),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        const updated = await db
          .update(flowSchedulesTable)
          .set({
            flowId: schedule.flowId,
            daysOfWeek: [...schedule.daysOfWeek],
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            active: schedule.active,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(flowSchedulesTable.id, schedule.id),
              eq(flowSchedulesTable.tenantId, schedule.tenantId),
            ),
          )
          .returning();
        const row = updated[0];
        if (!row) {
          throw new Error("Falha ao atualizar schedule.");
        }
        return mapRowToEntity(row);
      }

      const inserted = await db
        .insert(flowSchedulesTable)
        .values({
          id: schedule.id,
          tenantId: schedule.tenantId,
          flowId: schedule.flowId,
          daysOfWeek: [...schedule.daysOfWeek],
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          active: schedule.active,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt,
        })
        .returning();
      const row = inserted[0];
      if (!row) {
        throw new Error("Falha ao criar schedule.");
      }
      return mapRowToEntity(row);
    },

    async delete(tenantId: string, scheduleId: FlowScheduleId): Promise<void> {
      await db
        .delete(flowSchedulesTable)
        .where(
          and(eq(flowSchedulesTable.id, scheduleId), eq(flowSchedulesTable.tenantId, tenantId)),
        );
    },

    async findOverlapping(
      tenantId: string,
      daysOfWeek: readonly DayOfWeek[],
      startTime: string,
      endTime: string,
      excludeId?: FlowScheduleId | undefined,
    ): Promise<readonly FlowScheduleEntity[]> {
      const activeSchedules = await this.findActiveByTenant(tenantId);
      return activeSchedules.filter((schedule) => {
        if (excludeId && schedule.id === excludeId) {
          return false;
        }
        const hasCommonDay = schedule.daysOfWeek.some((d) => daysOfWeek.includes(d));
        if (!hasCommonDay) {
          return false;
        }
        return schedule.startTime < endTime && startTime < schedule.endTime;
      });
    },
  };
}
