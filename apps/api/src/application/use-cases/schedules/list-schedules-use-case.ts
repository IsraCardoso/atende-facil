/** Lista schedules ativos de um tenant (RN-027). */
import type { FlowScheduleRepositoryPort } from "../../../domain/ports/schedule-ports";
import type { FlowScheduleEntity } from "../../../domain/schedule-types";

type ListSchedulesInput = Readonly<{
  tenantId: string;
}>;

type ListSchedulesOutput = Readonly<{ schedules: readonly FlowScheduleEntity[] }>;

type ListSchedulesUseCase = Readonly<{
  execute: (input: ListSchedulesInput) => Promise<ListSchedulesOutput>;
}>;

export function createListSchedulesUseCase(deps: {
  scheduleRepository: FlowScheduleRepositoryPort;
}): ListSchedulesUseCase {
  return {
    async execute(input: ListSchedulesInput): Promise<ListSchedulesOutput> {
      const schedules = await deps.scheduleRepository.findActiveByTenant(input.tenantId);
      return { schedules };
    },
  };
}

export type { ListSchedulesInput, ListSchedulesOutput, ListSchedulesUseCase };
