/** Publica um flow (draft → published). Executa validateFlowDefinition e bloqueia se houver erros (RN-020, RN-010). */
import type { Flow, FlowValidationResult } from "flow";
import { validateFlowDefinition } from "flow";

import type { FlowEntity, FlowId } from "../../../domain/flow-types";
import type { FlowRepositoryPort } from "../../../domain/ports/flow-ports";
import { createAppError } from "../../errors/app-error";

type PublishFlowInput = Readonly<{
  tenantId: string;
  flowId: FlowId;
}>;

type PublishFlowOutput = Readonly<{
  flow: FlowEntity;
  validation: FlowValidationResult;
}>;

type PublishFlowUseCaseDependencies = Readonly<{
  flowRepository: FlowRepositoryPort;
}>;

type PublishFlowUseCase = Readonly<{
  execute: (input: PublishFlowInput) => Promise<PublishFlowOutput>;
}>;

export function createPublishFlowUseCase(
  dependencies: PublishFlowUseCaseDependencies,
): PublishFlowUseCase {
  const { flowRepository } = dependencies;

  return {
    async execute(input: PublishFlowInput): Promise<PublishFlowOutput> {
      const flow = await flowRepository.findById(input.tenantId, input.flowId);

      if (!flow) {
        throw createAppError("FLOW_NOT_FOUND", "Flow nao encontrado.");
      }

      if (flow.status !== "draft") {
        throw createAppError(
          "FLOW_INVALID_TRANSITION",
          `Publicacao requer status 'draft'. Status atual: '${flow.status}'.`,
        );
      }

      const flowDefinition = flow.definition as unknown as Flow;
      const validation = validateFlowDefinition(flowDefinition);

      if (!validation.isValid) {
        throw createAppError("FLOW_VALIDATION_FAILED", "Flow possui erros de validacao.", {
          issues: validation.issues,
        });
      }

      const updated = await flowRepository.updateStatus(input.tenantId, input.flowId, "published");

      return { flow: updated, validation };
    },
  };
}

export type {
  PublishFlowInput,
  PublishFlowOutput,
  PublishFlowUseCase,
  PublishFlowUseCaseDependencies,
};
