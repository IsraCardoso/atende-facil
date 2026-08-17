/** Atualiza a definition JSON de um flow existente. Incrementa version e reseta status para draft se publicado (RN-020). */
import type { FlowEntity, FlowId } from "../../../domain/flow-types";
import type { FlowRepositoryPort } from "../../../domain/ports/flow-ports";
import { createAppError } from "../../errors/app-error";

type UpdateFlowDefinitionInput = Readonly<{
  tenantId: string;
  flowId: FlowId;
  name?: string | undefined;
  description?: string | undefined;
  definition?: Readonly<Record<string, unknown>> | undefined;
}>;

type UpdateFlowDefinitionOutput = Readonly<{
  flow: FlowEntity;
}>;

type UpdateFlowDefinitionUseCaseDependencies = Readonly<{
  flowRepository: FlowRepositoryPort;
}>;

type UpdateFlowDefinitionUseCase = Readonly<{
  execute: (input: UpdateFlowDefinitionInput) => Promise<UpdateFlowDefinitionOutput>;
}>;

export function createUpdateFlowDefinitionUseCase(
  dependencies: UpdateFlowDefinitionUseCaseDependencies,
): UpdateFlowDefinitionUseCase {
  const { flowRepository } = dependencies;

  return {
    async execute(input: UpdateFlowDefinitionInput): Promise<UpdateFlowDefinitionOutput> {
      const existing = await flowRepository.findById(input.tenantId, input.flowId);

      if (!existing) {
        throw createAppError("FLOW_NOT_FOUND", "Flow nao encontrado.");
      }

      if (existing.status === "active") {
        throw createAppError(
          "FLOW_INVALID_TRANSITION",
          "Nao e possivel editar um flow ativo. Desative-o primeiro.",
        );
      }

      if (existing.status === "archived") {
        throw createAppError("FLOW_INVALID_TRANSITION", "Nao e possivel editar um flow arquivado.");
      }

      const definition =
        input.definition !== undefined
          ? {
              ...input.definition,
              id: input.definition.id ?? existing.id,
              tenantId: input.definition.tenantId ?? existing.tenantId,
            }
          : existing.definition;

      const updated: FlowEntity = {
        ...existing,
        name: input.name?.trim() ?? existing.name,
        description:
          input.description !== undefined ? input.description.trim() || null : existing.description,
        definition,
        version: existing.version + 1,
        status: "draft",
        updatedAt: new Date(),
      };

      const saved = await flowRepository.save(updated);
      return { flow: saved };
    },
  };
}

export type {
  UpdateFlowDefinitionInput,
  UpdateFlowDefinitionOutput,
  UpdateFlowDefinitionUseCase,
  UpdateFlowDefinitionUseCaseDependencies,
};
