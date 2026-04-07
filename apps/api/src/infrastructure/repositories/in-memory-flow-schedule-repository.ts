/** Repositorio in-memory de flow schedules para testes e dev sem banco (RN-027). */
import type { FlowScheduleRepositoryPort } from "../../domain/ports/schedule-ports";
import type { DayOfWeek, FlowScheduleEntity, FlowScheduleId } from "../../domain/schedule-types";

export function createInMemoryFlowScheduleRepository(): FlowScheduleRepositoryPort {
  const store = new Map<string, FlowScheduleEntity>();

  return {
    async findActiveByTenant(tenantId: string): Promise<readonly FlowScheduleEntity[]> {
      return [...store.values()].filter((s) => s.tenantId === tenantId && s.active);
    },

    async findById(
      tenantId: string,
      scheduleId: FlowScheduleId,
    ): Promise<FlowScheduleEntity | null> {
      const schedule = store.get(scheduleId);
      if (!schedule || schedule.tenantId !== tenantId) return null;
      return schedule;
    },

    async save(schedule: FlowScheduleEntity): Promise<FlowScheduleEntity> {
      store.set(schedule.id, schedule);
      return schedule;
    },

    async delete(tenantId: string, scheduleId: FlowScheduleId): Promise<void> {
      const schedule = store.get(scheduleId);
      if (schedule && schedule.tenantId === tenantId) {
        store.delete(scheduleId);
      }
    },

    async findOverlapping(
      tenantId: string,
      daysOfWeek: readonly DayOfWeek[],
      startTime: string,
      endTime: string,
      excludeId?: FlowScheduleId | undefined,
    ): Promise<readonly FlowScheduleEntity[]> {
      return [...store.values()].filter((schedule) => {
        if (schedule.tenantId !== tenantId || !schedule.active) return false;
        if (excludeId && schedule.id === excludeId) return false;
        const hasCommonDay = schedule.daysOfWeek.some((d) => daysOfWeek.includes(d));
        if (!hasCommonDay) return false;
        return schedule.startTime < endTime && startTime < schedule.endTime;
      });
    },
  };
}
