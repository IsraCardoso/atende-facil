/** Arquiva um flow (qualquer status → archived). Soft delete logico (RN-020). */
import type { FlowId } from "../../../domain/flow-types";
import { isValidFlowTransition } from "../../../domain/flow-types";
import type { FlowRepositoryPort } from "../../../domain/ports/flow-ports";
import { createAppError } from "../../errors/app-error";

type ArchiveFlowInput = Readonly<{
  tenantId: string;
  flowId: FlowId;
}>;

type ArchiveFlowUseCaseDependencies = Readonly<{
  flowRepository: FlowRepositoryPort;
}>;

type ArchiveFlowUseCase = Readonly<{
  execute: (input: ArchiveFlowInput) => Promise<void>;
}>;

export function createArchiveFlowUseCase(
  dependencies: ArchiveFlowUseCaseDependencies,
): ArchiveFlowUseCase {
  const { flowRepository } = dependencies;

  return {
    async execute(input: ArchiveFlowInput): Promise<void> {
      const flow = await flowRepository.findById(input.tenantId, input.flowId);

      if (!flow) {
        throw createAppError("FLOW_NOT_FOUND", "Flow nao encontrado.");
      }

      if (!isValidFlowTransition(flow.status, "archived")) {
        throw createAppError("FLOW_INVALID_TRANSITION", "Flow ja esta arquivado.");
      }

      await flowRepository.softDelete(input.tenantId, input.flowId);
    },
  };
}

export type { ArchiveFlowInput, ArchiveFlowUseCase, ArchiveFlowUseCaseDependencies };
