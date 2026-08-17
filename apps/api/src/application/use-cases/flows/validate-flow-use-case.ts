/** Valida a definition de um flow sem mudar status. Retorna resultado de validacao (RN-010). */
import type { Flow, FlowValidationResult } from "flow";
import { validateFlowDefinition } from "flow";

import type { FlowId } from "../../../domain/flow-types";
import type { FlowRepositoryPort } from "../../../domain/ports/flow-ports";
import { createAppError } from "../../errors/app-error";

type ValidateFlowInput = Readonly<{
  tenantId: string;
  flowId: FlowId;
}>;

type ValidateFlowOutput = Readonly<{
  validation: FlowValidationResult;
}>;

type ValidateFlowUseCaseDependencies = Readonly<{
  flowRepository: FlowRepositoryPort;
}>;

type ValidateFlowUseCase = Readonly<{
  execute: (input: ValidateFlowInput) => Promise<ValidateFlowOutput>;
}>;

export function createValidateFlowUseCase(
  dependencies: ValidateFlowUseCaseDependencies,
): ValidateFlowUseCase {
  const { flowRepository } = dependencies;

  return {
    async execute(input: ValidateFlowInput): Promise<ValidateFlowOutput> {
      const flow = await flowRepository.findById(input.tenantId, input.flowId);

      if (!flow) {
        throw createAppError("FLOW_NOT_FOUND", "Flow nao encontrado.");
      }

      const flowDefinition = flow.definition as unknown as Flow;
      const validation = validateFlowDefinition(flowDefinition);

      return { validation };
    },
  };
}

export type {
  ValidateFlowInput,
  ValidateFlowOutput,
  ValidateFlowUseCase,
  ValidateFlowUseCaseDependencies,
};
