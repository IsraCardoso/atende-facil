/** Ports de persistencia de schedules. Contrato CRUD + validacao de overlap consumido pelos use cases (RN-027). */
import type { DayOfWeek, FlowScheduleEntity, FlowScheduleId } from "../schedule-types";

type FlowScheduleRepositoryPort = Readonly<{
  findActiveByTenant: (tenantId: string) => Promise<readonly FlowScheduleEntity[]>;
  findById: (tenantId: string, scheduleId: FlowScheduleId) => Promise<FlowScheduleEntity | null>;
  save: (schedule: FlowScheduleEntity) => Promise<FlowScheduleEntity>;
  delete: (tenantId: string, scheduleId: FlowScheduleId) => Promise<void>;
  findOverlapping: (
    tenantId: string,
    daysOfWeek: readonly DayOfWeek[],
    startTime: string,
    endTime: string,
    excludeId?: FlowScheduleId | undefined,
  ) => Promise<readonly FlowScheduleEntity[]>;
}>;

export type { FlowScheduleRepositoryPort };
