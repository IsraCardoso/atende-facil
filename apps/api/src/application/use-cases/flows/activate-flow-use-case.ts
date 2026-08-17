/** Ativa um flow (published → active). Desativa o flow ativo anterior automaticamente. Max 1 ativo por tenant (RN-020). */
import type { FlowEntity, FlowId } from "../../../domain/flow-types";
import { isValidFlowTransition } from "../../../domain/flow-types";
import type { FlowRepositoryPort } from "../../../domain/ports/flow-ports";
import { createAppError } from "../../errors/app-error";

type ActivateFlowInput = Readonly<{
  tenantId: string;
  flowId: FlowId;
}>;

type ActivateFlowOutput = Readonly<{
  flow: FlowEntity;
  previousActiveFlow: FlowEntity | null;
}>;

type ActivateFlowUseCaseDependencies = Readonly<{
  flowRepository: FlowRepositoryPort;
}>;

type ActivateFlowUseCase = Readonly<{
  execute: (input: ActivateFlowInput) => Promise<ActivateFlowOutput>;
}>;

export function createActivateFlowUseCase(
  dependencies: ActivateFlowUseCaseDependencies,
): ActivateFlowUseCase {
  const { flowRepository } = dependencies;

  return {
    async execute(input: ActivateFlowInput): Promise<ActivateFlowOutput> {
      const flow = await flowRepository.findById(input.tenantId, input.flowId);

      if (!flow) {
        throw createAppError("FLOW_NOT_FOUND", "Flow nao encontrado.");
      }

      if (!isValidFlowTransition(flow.status, "active")) {
        throw createAppError(
          "FLOW_INVALID_TRANSITION",
          `Transicao de '${flow.status}' para 'active' nao e permitida. Publique o flow antes de ativa-lo.`,
        );
      }

      const result = await flowRepository.activateExclusive(input.tenantId, input.flowId);

      if (!result.ok) {
        throw createAppError(
          "FLOW_ACTIVATION_CONFLICT",
          "Outra ativacao concorrente venceu a corrida — tente novamente.",
        );
      }

      return { flow: result.activated, previousActiveFlow: result.previousActiveFlow };
    },
  };
}

export type {
  ActivateFlowInput,
  ActivateFlowOutput,
  ActivateFlowUseCase,
  ActivateFlowUseCaseDependencies,
};
