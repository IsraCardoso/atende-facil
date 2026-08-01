/**
 * Ativa o atendimento de um flow num único passo: valida, publica (se ainda draft) e ativa,
 * desativando o flow ativo anterior — mesma lógica de PublishFlowUseCase + ActivateFlowUseCase
 * combinada, evitando o operador ter que acionar os dois passos manualmente (RN-010, RN-020).
 */
import type { Flow, FlowValidationResult } from "flow";
import { validateFlowDefinition } from "flow";

import type { FlowEntity, FlowId } from "../../../domain/flow-types";
import { isValidFlowTransition } from "../../../domain/flow-types";
import type { FlowRepositoryPort } from "../../../domain/ports/flow-ports";
import { createAppError } from "../../errors/app-error";

type GoLiveFlowInput = Readonly<{
  tenantId: string;
  flowId: FlowId;
}>;

type GoLiveFlowOutput = Readonly<{
  flow: FlowEntity;
  previousActiveFlow: FlowEntity | null;
  validation: FlowValidationResult;
}>;

type GoLiveFlowUseCaseDependencies = Readonly<{
  flowRepository: FlowRepositoryPort;
}>;

type GoLiveFlowUseCase = Readonly<{
  execute: (input: GoLiveFlowInput) => Promise<GoLiveFlowOutput>;
}>;

export function createGoLiveFlowUseCase(
  dependencies: GoLiveFlowUseCaseDependencies,
): GoLiveFlowUseCase {
  const { flowRepository } = dependencies;

  return {
    async execute(input: GoLiveFlowInput): Promise<GoLiveFlowOutput> {
      const flow = await flowRepository.findById(input.tenantId, input.flowId);

      if (!flow) {
        throw createAppError("FLOW_NOT_FOUND", "Flow nao encontrado.");
      }

      if (flow.status === "active") {
        const validation = validateFlowDefinition(flow.definition as unknown as Flow);
        return { flow, previousActiveFlow: null, validation };
      }

      if (flow.status !== "draft" && flow.status !== "published") {
        throw createAppError(
          "FLOW_INVALID_TRANSITION",
          `Nao e possivel ativar o atendimento a partir do status '${flow.status}'.`,
        );
      }

      const validation = validateFlowDefinition(flow.definition as unknown as Flow);

      if (!validation.isValid) {
        throw createAppError("FLOW_VALIDATION_FAILED", "Flow possui erros de validacao.", {
          issues: validation.issues,
        });
      }

      const publishedFlow =
        flow.status === "draft"
          ? await flowRepository.updateStatus(input.tenantId, input.flowId, "published")
          : flow;

      if (!isValidFlowTransition(publishedFlow.status, "active")) {
        throw createAppError(
          "FLOW_INVALID_TRANSITION",
          `Transicao de '${publishedFlow.status}' para 'active' nao e permitida.`,
        );
      }

      const result = await flowRepository.activateExclusive(input.tenantId, input.flowId);

      if (!result.ok) {
        throw createAppError(
          "FLOW_ACTIVATION_CONFLICT",
          "Outra ativacao concorrente venceu a corrida — tente novamente.",
        );
      }

      return { flow: result.activated, previousActiveFlow: result.previousActiveFlow, validation };
    },
  };
}

export type { GoLiveFlowInput, GoLiveFlowOutput, GoLiveFlowUseCase, GoLiveFlowUseCaseDependencies };
