/** Soft delete de flow — muda status para archived e preenche deleted_at (RN-020). */
import type { FlowId } from "../../../domain/flow-types";
import type { FlowRepositoryPort } from "../../../domain/ports/flow-ports";
import { createAppError } from "../../errors/app-error";

type DeleteFlowInput = Readonly<{
  tenantId: string;
  flowId: FlowId;
}>;

type DeleteFlowUseCaseDependencies = Readonly<{
  flowRepository: FlowRepositoryPort;
}>;

type DeleteFlowUseCase = Readonly<{
  execute: (input: DeleteFlowInput) => Promise<void>;
}>;

export function createDeleteFlowUseCase(
  dependencies: DeleteFlowUseCaseDependencies,
): DeleteFlowUseCase {
  const { flowRepository } = dependencies;

  return {
    async execute(input: DeleteFlowInput): Promise<void> {
      const flow = await flowRepository.findById(input.tenantId, input.flowId);

      if (!flow) {
        throw createAppError("FLOW_NOT_FOUND", "Flow nao encontrado.");
      }

      await flowRepository.softDelete(input.tenantId, input.flowId);
    },
  };
}

export type { DeleteFlowInput, DeleteFlowUseCase, DeleteFlowUseCaseDependencies };
