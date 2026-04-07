/** Desativa um flow (active → published). Permite que outro flow seja ativado (RN-020). */
import type { FlowEntity, FlowId } from "../../../domain/flow-types";
import type { FlowRepositoryPort } from "../../../domain/ports/flow-ports";
import { createAppError } from "../../errors/app-error";

type DeactivateFlowInput = Readonly<{
  tenantId: string;
  flowId: FlowId;
}>;

type DeactivateFlowOutput = Readonly<{
  flow: FlowEntity;
}>;

type DeactivateFlowUseCaseDependencies = Readonly<{
  flowRepository: FlowRepositoryPort;
}>;

type DeactivateFlowUseCase = Readonly<{
  execute: (input: DeactivateFlowInput) => Promise<DeactivateFlowOutput>;
}>;

export function createDeactivateFlowUseCase(
  dependencies: DeactivateFlowUseCaseDependencies,
): DeactivateFlowUseCase {
  const { flowRepository } = dependencies;

  return {
    async execute(input: DeactivateFlowInput): Promise<DeactivateFlowOutput> {
      const flow = await flowRepository.findById(input.tenantId, input.flowId);

      if (!flow) {
        throw createAppError("FLOW_NOT_FOUND", "Flow nao encontrado.");
      }

      if (flow.status !== "active") {
        throw createAppError(
          "FLOW_INVALID_TRANSITION",
          `Desativacao requer status 'active'. Status atual: '${flow.status}'.`,
        );
      }

      const updated = await flowRepository.updateStatus(input.tenantId, input.flowId, "published");

      return { flow: updated };
    },
  };
}

export type {
  DeactivateFlowInput,
  DeactivateFlowOutput,
  DeactivateFlowUseCase,
  DeactivateFlowUseCaseDependencies,
};
