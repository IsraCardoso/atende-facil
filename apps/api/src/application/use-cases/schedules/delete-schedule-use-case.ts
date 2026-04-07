/** Deleta um schedule (hard delete). Valida RBAC (admin/manager) (RN-027). */
import type { UserRole } from "../../../domain/auth-types";
import type { FlowScheduleRepositoryPort } from "../../../domain/ports/schedule-ports";
import { createFlowScheduleId } from "../../../domain/schedule-types";
import { assertScheduleWriteRole } from "./assert-schedule-write-role";

type DeleteScheduleInput = Readonly<{
  tenantId: string;
  role: UserRole;
  scheduleId: string;
}>;

type DeleteScheduleUseCase = Readonly<{
  execute: (input: DeleteScheduleInput) => Promise<void>;
}>;

export function createDeleteScheduleUseCase(deps: {
  scheduleRepository: FlowScheduleRepositoryPort;
}): DeleteScheduleUseCase {
  return {
    async execute(input: DeleteScheduleInput): Promise<void> {
      assertScheduleWriteRole(input.role, "deletar");

      const scheduleId = createFlowScheduleId(input.scheduleId);
      const existing = await deps.scheduleRepository.findById(input.tenantId, scheduleId);
      if (!existing) {
        throw new Error("SCHEDULE_NOT_FOUND: schedule nao encontrado.");
      }

      await deps.scheduleRepository.delete(input.tenantId, scheduleId);
    },
  };
}

export type { DeleteScheduleInput, DeleteScheduleUseCase };
