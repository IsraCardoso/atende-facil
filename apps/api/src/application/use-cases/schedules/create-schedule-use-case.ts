/** Cria um novo schedule de fluxo. Valida overlap e RBAC (admin/manager) (RN-027). */
import type { UserRole } from "../../../domain/auth-types";
import type { FlowId } from "../../../domain/flow-types";
import type { FlowRepositoryPort } from "../../../domain/ports/flow-ports";
import type { FlowScheduleRepositoryPort } from "../../../domain/ports/schedule-ports";
import {
  createDaysOfWeek,
  createFlowScheduleId,
  type FlowScheduleEntity,
} from "../../../domain/schedule-types";
import { validateScheduleOverlap } from "../../services/schedule-overlap-validator";
import { assertScheduleWriteRole } from "./assert-schedule-write-role";

type CreateScheduleInput = Readonly<{
  tenantId: string;
  role: UserRole;
  flowId: string;
  daysOfWeek: readonly number[];
  startTime: string;
  endTime: string;
}>;

type CreateScheduleOutput = Readonly<{ schedule: FlowScheduleEntity }>;

type CreateScheduleUseCaseDependencies = Readonly<{
  scheduleRepository: FlowScheduleRepositoryPort;
  flowRepository: FlowRepositoryPort;
  idGenerator?: () => string;
}>;

type CreateScheduleUseCase = Readonly<{
  execute: (input: CreateScheduleInput) => Promise<CreateScheduleOutput>;
}>;

export function createCreateScheduleUseCase(
  deps: CreateScheduleUseCaseDependencies,
): CreateScheduleUseCase {
  const { scheduleRepository, flowRepository, idGenerator = () => crypto.randomUUID() } = deps;

  return {
    async execute(input: CreateScheduleInput): Promise<CreateScheduleOutput> {
      assertScheduleWriteRole(input.role, "criar");

      const flow = await flowRepository.findById(input.tenantId, input.flowId as FlowId);
      if (!flow) {
        throw new Error(
          "SCHEDULE_NOT_FOUND: fluxo informado nao existe ou nao pertence ao tenant.",
        );
      }

      const days = createDaysOfWeek(input.daysOfWeek);
      const existing = await scheduleRepository.findActiveByTenant(input.tenantId);
      const overlapResult = validateScheduleOverlap(existing, {
        daysOfWeek: days,
        startTime: input.startTime,
        endTime: input.endTime,
      });

      if (!overlapResult.valid) {
        throw new Error(`SCHEDULE_OVERLAP: conflito de horario detectado.`);
      }

      const now = new Date();
      const schedule: FlowScheduleEntity = {
        id: createFlowScheduleId(idGenerator()),
        tenantId: input.tenantId,
        flowId: input.flowId,
        daysOfWeek: days,
        startTime: input.startTime,
        endTime: input.endTime,
        active: true,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await scheduleRepository.save(schedule);
      return { schedule: saved };
    },
  };
}

export type { CreateScheduleInput, CreateScheduleOutput, CreateScheduleUseCase };
