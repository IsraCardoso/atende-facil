/** Atualiza um schedule existente. Valida overlap excluindo self e RBAC (RN-027). */
import type { UserRole } from "../../../domain/auth-types";
import type { FlowScheduleRepositoryPort } from "../../../domain/ports/schedule-ports";
import {
  createDaysOfWeek,
  createFlowScheduleId,
  type DayOfWeek,
  type FlowScheduleEntity,
} from "../../../domain/schedule-types";
import { validateScheduleOverlap } from "../../services/schedule-overlap-validator";

type UpdateScheduleInput = Readonly<{
  tenantId: string;
  role: UserRole;
  scheduleId: string;
  flowId?: string | undefined;
  daysOfWeek?: readonly number[] | undefined;
  startTime?: string | undefined;
  endTime?: string | undefined;
  active?: boolean | undefined;
}>;

type UpdateScheduleOutput = Readonly<{ schedule: FlowScheduleEntity }>;

type UpdateScheduleUseCase = Readonly<{
  execute: (input: UpdateScheduleInput) => Promise<UpdateScheduleOutput>;
}>;

export function createUpdateScheduleUseCase(deps: {
  scheduleRepository: FlowScheduleRepositoryPort;
}): UpdateScheduleUseCase {
  return {
    async execute(input: UpdateScheduleInput): Promise<UpdateScheduleOutput> {
      if (input.role !== "admin" && input.role !== "manager") {
        throw new Error("SCHEDULE_FORBIDDEN: apenas admin ou manager podem editar schedules.");
      }

      const scheduleId = createFlowScheduleId(input.scheduleId);
      const existing = await deps.scheduleRepository.findById(input.tenantId, scheduleId);
      if (!existing) {
        throw new Error("SCHEDULE_NOT_FOUND: schedule nao encontrado.");
      }

      const updatedDays = input.daysOfWeek
        ? createDaysOfWeek(input.daysOfWeek)
        : existing.daysOfWeek;
      const updatedStartTime = input.startTime ?? existing.startTime;
      const updatedEndTime = input.endTime ?? existing.endTime;

      const allSchedules = await deps.scheduleRepository.findActiveByTenant(input.tenantId);
      const overlapResult = validateScheduleOverlap(
        [...allSchedules],
        {
          id: scheduleId,
          daysOfWeek: updatedDays as readonly DayOfWeek[],
          startTime: updatedStartTime,
          endTime: updatedEndTime,
        },
      );

      if (!overlapResult.valid) {
        throw new Error("SCHEDULE_OVERLAP: conflito de horario detectado.");
      }

      const updated: FlowScheduleEntity = {
        ...existing,
        flowId: input.flowId ?? existing.flowId,
        daysOfWeek: updatedDays,
        startTime: updatedStartTime,
        endTime: updatedEndTime,
        active: input.active ?? existing.active,
        updatedAt: new Date(),
      };

      const saved = await deps.scheduleRepository.save(updated);
      return { schedule: saved };
    },
  };
}

export type { UpdateScheduleInput, UpdateScheduleOutput, UpdateScheduleUseCase };
