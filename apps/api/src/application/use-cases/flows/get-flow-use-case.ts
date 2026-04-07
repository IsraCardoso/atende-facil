/** Busca um flow por ID com tenant isolation. Retorna 404 se nao encontrado (RN-020). */
import type { FlowEntity, FlowId } from "../../../domain/flow-types";
import type { FlowRepositoryPort } from "../../../domain/ports/flow-ports";
import { createAppError } from "../../errors/app-error";

type GetFlowInput = Readonly<{
  tenantId: string;
  flowId: FlowId;
}>;

type GetFlowUseCaseDependencies = Readonly<{
  flowRepository: FlowRepositoryPort;
}>;

type GetFlowUseCase = Readonly<{
  execute: (input: GetFlowInput) => Promise<FlowEntity>;
}>;

export function createGetFlowUseCase(dependencies: GetFlowUseCaseDependencies): GetFlowUseCase {
  const { flowRepository } = dependencies;

  return {
    async execute(input: GetFlowInput): Promise<FlowEntity> {
      const flow = await flowRepository.findById(input.tenantId, input.flowId);

      if (!flow) {
        throw createAppError("FLOW_NOT_FOUND", "Flow nao encontrado.");
      }

      return flow;
    },
  };
}

export type { GetFlowInput, GetFlowUseCase, GetFlowUseCaseDependencies };
