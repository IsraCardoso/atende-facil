/** Modulo DI para flows. Registra repositorio (Drizzle ou in-memory) e todos os use cases no container. */
import { createContainer, createToken } from "container";
import type { PostgresJsDatabase, schema } from "db";

import {
  createActivateFlowUseCase,
  createArchiveFlowUseCase,
  createCreateFlowUseCase,
  createDeactivateFlowUseCase,
  createDeleteFlowUseCase,
  createGetFlowUseCase,
  createListFlowsUseCase,
  createPublishFlowUseCase,
  createUpdateFlowDefinitionUseCase,
  createValidateFlowUseCase,
} from "../../application/use-cases/flows";
import type { ActivateFlowUseCase } from "../../application/use-cases/flows/activate-flow-use-case";
import type { ArchiveFlowUseCase } from "../../application/use-cases/flows/archive-flow-use-case";
import type { CreateFlowUseCase } from "../../application/use-cases/flows/create-flow-use-case";
import type { DeactivateFlowUseCase } from "../../application/use-cases/flows/deactivate-flow-use-case";
import type { DeleteFlowUseCase } from "../../application/use-cases/flows/delete-flow-use-case";
import type { GetFlowUseCase } from "../../application/use-cases/flows/get-flow-use-case";
import type { ListFlowsUseCase } from "../../application/use-cases/flows/list-flows-use-case";
import type { PublishFlowUseCase } from "../../application/use-cases/flows/publish-flow-use-case";
import type { UpdateFlowDefinitionUseCase } from "../../application/use-cases/flows/update-flow-definition-use-case";
import type { ValidateFlowUseCase } from "../../application/use-cases/flows/validate-flow-use-case";
import type { FlowRepositoryPort } from "../../domain/ports/flow-ports";
import { createDrizzleFlowRepository } from "../repositories/drizzle-flow-repository";
import { createInMemoryFlowRepository } from "../repositories/in-memory-flow-repository";

type FlowModule = Readonly<{
  flowRepository: FlowRepositoryPort;
  createFlow: CreateFlowUseCase;
  updateFlowDefinition: UpdateFlowDefinitionUseCase;
  getFlow: GetFlowUseCase;
  listFlows: ListFlowsUseCase;
  deleteFlow: DeleteFlowUseCase;
  publishFlow: PublishFlowUseCase;
  activateFlow: ActivateFlowUseCase;
  deactivateFlow: DeactivateFlowUseCase;
  archiveFlow: ArchiveFlowUseCase;
  validateFlow: ValidateFlowUseCase;
}>;

type CreateFlowModuleInput = Readonly<{
  db?: PostgresJsDatabase<typeof schema>;
}>;

type FlowContainerTokenMap = Readonly<{
  flowRepository: FlowRepositoryPort;
  createFlow: CreateFlowUseCase;
  updateFlowDefinition: UpdateFlowDefinitionUseCase;
  getFlow: GetFlowUseCase;
  listFlows: ListFlowsUseCase;
  deleteFlow: DeleteFlowUseCase;
  publishFlow: PublishFlowUseCase;
  activateFlow: ActivateFlowUseCase;
  deactivateFlow: DeactivateFlowUseCase;
  archiveFlow: ArchiveFlowUseCase;
  validateFlow: ValidateFlowUseCase;
}>;

const flowTokens: Readonly<{
  [K in keyof FlowContainerTokenMap]: ReturnType<typeof createToken<FlowContainerTokenMap[K]>>;
}> = {
  flowRepository: createToken<FlowRepositoryPort>("flow.flowRepository"),
  createFlow: createToken<CreateFlowUseCase>("flow.createFlow"),
  updateFlowDefinition: createToken<UpdateFlowDefinitionUseCase>("flow.updateFlowDefinition"),
  getFlow: createToken<GetFlowUseCase>("flow.getFlow"),
  listFlows: createToken<ListFlowsUseCase>("flow.listFlows"),
  deleteFlow: createToken<DeleteFlowUseCase>("flow.deleteFlow"),
  publishFlow: createToken<PublishFlowUseCase>("flow.publishFlow"),
  activateFlow: createToken<ActivateFlowUseCase>("flow.activateFlow"),
  deactivateFlow: createToken<DeactivateFlowUseCase>("flow.deactivateFlow"),
  archiveFlow: createToken<ArchiveFlowUseCase>("flow.archiveFlow"),
  validateFlow: createToken<ValidateFlowUseCase>("flow.validateFlow"),
};

export function createFlowModule(input: CreateFlowModuleInput): FlowModule {
  const container = createContainer();

  container.registerSingleton(flowTokens.flowRepository, () =>
    input.db ? createDrizzleFlowRepository(input.db) : createInMemoryFlowRepository(),
  );

  container.registerTransient(flowTokens.createFlow, (resolver) =>
    createCreateFlowUseCase({
      flowRepository: resolver.resolve(flowTokens.flowRepository),
    }),
  );

  container.registerTransient(flowTokens.updateFlowDefinition, (resolver) =>
    createUpdateFlowDefinitionUseCase({
      flowRepository: resolver.resolve(flowTokens.flowRepository),
    }),
  );

  container.registerTransient(flowTokens.getFlow, (resolver) =>
    createGetFlowUseCase({
      flowRepository: resolver.resolve(flowTokens.flowRepository),
    }),
  );

  container.registerTransient(flowTokens.listFlows, (resolver) =>
    createListFlowsUseCase({
      flowRepository: resolver.resolve(flowTokens.flowRepository),
    }),
  );

  container.registerTransient(flowTokens.deleteFlow, (resolver) =>
    createDeleteFlowUseCase({
      flowRepository: resolver.resolve(flowTokens.flowRepository),
    }),
  );

  container.registerTransient(flowTokens.publishFlow, (resolver) =>
    createPublishFlowUseCase({
      flowRepository: resolver.resolve(flowTokens.flowRepository),
    }),
  );

  container.registerTransient(flowTokens.activateFlow, (resolver) =>
    createActivateFlowUseCase({
      flowRepository: resolver.resolve(flowTokens.flowRepository),
    }),
  );

  container.registerTransient(flowTokens.deactivateFlow, (resolver) =>
    createDeactivateFlowUseCase({
      flowRepository: resolver.resolve(flowTokens.flowRepository),
    }),
  );

  container.registerTransient(flowTokens.archiveFlow, (resolver) =>
    createArchiveFlowUseCase({
      flowRepository: resolver.resolve(flowTokens.flowRepository),
    }),
  );

  container.registerTransient(flowTokens.validateFlow, (resolver) =>
    createValidateFlowUseCase({
      flowRepository: resolver.resolve(flowTokens.flowRepository),
    }),
  );

  return {
    flowRepository: container.resolve(flowTokens.flowRepository),
    createFlow: container.resolve(flowTokens.createFlow),
    updateFlowDefinition: container.resolve(flowTokens.updateFlowDefinition),
    getFlow: container.resolve(flowTokens.getFlow),
    listFlows: container.resolve(flowTokens.listFlows),
    deleteFlow: container.resolve(flowTokens.deleteFlow),
    publishFlow: container.resolve(flowTokens.publishFlow),
    activateFlow: container.resolve(flowTokens.activateFlow),
    deactivateFlow: container.resolve(flowTokens.deactivateFlow),
    archiveFlow: container.resolve(flowTokens.archiveFlow),
    validateFlow: container.resolve(flowTokens.validateFlow),
  };
}

export type { CreateFlowModuleInput, FlowModule };
