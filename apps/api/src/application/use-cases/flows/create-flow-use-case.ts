/** Cria um novo flow em estado draft. Validacao de nome obrigatoria na borda (RN-020). */
import { createFlowId, type FlowEntity } from "../../../domain/flow-types";
import type { FlowRepositoryPort } from "../../../domain/ports/flow-ports";

type CreateFlowInput = Readonly<{
  tenantId: string;
  name: string;
  description?: string | undefined;
}>;

type CreateFlowOutput = Readonly<{
  flow: FlowEntity;
}>;

type CreateFlowUseCaseDependencies = Readonly<{
  flowRepository: FlowRepositoryPort;
  idGenerator?: () => string;
}>;

type CreateFlowUseCase = Readonly<{
  execute: (input: CreateFlowInput) => Promise<CreateFlowOutput>;
}>;

function defaultIdGenerator(): string {
  return crypto.randomUUID();
}

export function createCreateFlowUseCase(
  dependencies: CreateFlowUseCaseDependencies,
): CreateFlowUseCase {
  const { flowRepository, idGenerator = defaultIdGenerator } = dependencies;

  return {
    async execute(input: CreateFlowInput): Promise<CreateFlowOutput> {
      const now = new Date();

      const flow: FlowEntity = {
        id: createFlowId(idGenerator()),
        tenantId: input.tenantId,
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        definition: {},
        status: "draft",
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      const saved = await flowRepository.save(flow);
      return { flow: saved };
    },
  };
}

export type { CreateFlowInput, CreateFlowOutput, CreateFlowUseCase, CreateFlowUseCaseDependencies };
