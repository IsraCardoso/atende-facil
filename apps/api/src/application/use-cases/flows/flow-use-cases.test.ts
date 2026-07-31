/** Testes unitarios de todos os use cases de flows. Cobre CRUD, lifecycle, validacao e tenant isolation. */
import { beforeEach, describe, expect, it } from "vitest";

import { createFlowId, type FlowEntity } from "../../../domain/flow-types";
import type { FlowRepositoryPort } from "../../../domain/ports/flow-ports";
import { createInMemoryFlowRepository } from "../../../infrastructure/repositories/in-memory-flow-repository";
import { AppError } from "../../errors/app-error";
import { createActivateFlowUseCase } from "./activate-flow-use-case";
import { createArchiveFlowUseCase } from "./archive-flow-use-case";
import { createCreateFlowUseCase } from "./create-flow-use-case";
import { createDeactivateFlowUseCase } from "./deactivate-flow-use-case";
import { createDeleteFlowUseCase } from "./delete-flow-use-case";
import { createGetFlowUseCase } from "./get-flow-use-case";
import { createGoLiveFlowUseCase } from "./go-live-flow-use-case";
import { createListFlowsUseCase } from "./list-flows-use-case";
import { createPublishFlowUseCase } from "./publish-flow-use-case";
import { createUpdateFlowDefinitionUseCase } from "./update-flow-definition-use-case";
import { createValidateFlowUseCase } from "./validate-flow-use-case";

const TENANT_A = "tenant-a-id";
const TENANT_B = "tenant-b-id";

function createValidFlowDefinition(): Readonly<Record<string, unknown>> {
  return {
    id: "flow-1",
    tenantId: TENANT_A,
    startNodeId: "start",
    nodes: [
      { id: "start", type: "message", text: "Bem-vindo!", nextNodeId: "end-node" },
      { id: "end-node", type: "end", summaryMessage: "Ate logo!" },
    ],
  };
}

function createInvalidFlowDefinition(): Readonly<Record<string, unknown>> {
  return {
    id: "flow-1",
    tenantId: TENANT_A,
    startNodeId: "nonexistent",
    nodes: [],
  };
}

async function seedDraftFlow(
  repo: FlowRepositoryPort,
  tenantId: string,
  overrides?: Partial<FlowEntity>,
): Promise<FlowEntity> {
  const id = createFlowId(crypto.randomUUID());
  const now = new Date();
  return repo.save({
    id,
    tenantId,
    name: "Test Flow",
    description: null,
    definition: createValidFlowDefinition(),
    status: "draft",
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  });
}

describe("CreateFlowUseCase", () => {
  let repo: FlowRepositoryPort;

  beforeEach(() => {
    repo = createInMemoryFlowRepository();
  });

  it("should create a flow with status draft", async () => {
    const useCase = createCreateFlowUseCase({ flowRepository: repo });
    const result = await useCase.execute({
      tenantId: TENANT_A,
      name: "Meu Fluxo",
      description: "Descricao",
    });

    expect(result.flow.status).toBe("draft");
    expect(result.flow.name).toBe("Meu Fluxo");
    expect(result.flow.description).toBe("Descricao");
    expect(result.flow.version).toBe(1);
    expect(result.flow.tenantId).toBe(TENANT_A);
  });

  it("should trim name and description", async () => {
    const useCase = createCreateFlowUseCase({ flowRepository: repo });
    const result = await useCase.execute({
      tenantId: TENANT_A,
      name: "  Spaced  ",
      description: "  desc  ",
    });

    expect(result.flow.name).toBe("Spaced");
    expect(result.flow.description).toBe("desc");
  });
});

describe("UpdateFlowDefinitionUseCase", () => {
  let repo: FlowRepositoryPort;

  beforeEach(() => {
    repo = createInMemoryFlowRepository();
  });

  it("should update definition and increment version", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A);
    const useCase = createUpdateFlowDefinitionUseCase({ flowRepository: repo });

    const result = await useCase.execute({
      tenantId: TENANT_A,
      flowId: flow.id,
      definition: { nodes: [{ id: "n1", type: "end" }], startNodeId: "n1" },
    });

    expect(result.flow.version).toBe(2);
    expect(result.flow.status).toBe("draft");
  });

  it("should throw FLOW_NOT_FOUND when flow does not exist", async () => {
    const useCase = createUpdateFlowDefinitionUseCase({ flowRepository: repo });

    await expect(
      useCase.execute({ tenantId: TENANT_A, flowId: createFlowId("nonexistent"), definition: {} }),
    ).rejects.toThrow(AppError);
  });

  it("should throw FLOW_INVALID_TRANSITION when flow is active", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A, { status: "active" });
    const useCase = createUpdateFlowDefinitionUseCase({ flowRepository: repo });

    await expect(
      useCase.execute({ tenantId: TENANT_A, flowId: flow.id, definition: {} }),
    ).rejects.toThrow(AppError);
  });

  it("should not find flow from different tenant", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A);
    const useCase = createUpdateFlowDefinitionUseCase({ flowRepository: repo });

    await expect(
      useCase.execute({ tenantId: TENANT_B, flowId: flow.id, definition: {} }),
    ).rejects.toThrow(AppError);
  });
});

describe("GetFlowUseCase", () => {
  let repo: FlowRepositoryPort;

  beforeEach(() => {
    repo = createInMemoryFlowRepository();
  });

  it("should return flow when found", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A);
    const useCase = createGetFlowUseCase({ flowRepository: repo });

    const result = await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });
    expect(result.id).toBe(flow.id);
  });

  it("should throw FLOW_NOT_FOUND when not found", async () => {
    const useCase = createGetFlowUseCase({ flowRepository: repo });

    await expect(
      useCase.execute({ tenantId: TENANT_A, flowId: createFlowId("nonexistent") }),
    ).rejects.toThrow(AppError);
  });

  it("should enforce tenant isolation", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A);
    const useCase = createGetFlowUseCase({ flowRepository: repo });

    await expect(useCase.execute({ tenantId: TENANT_B, flowId: flow.id })).rejects.toThrow(
      AppError,
    );
  });
});

describe("ListFlowsUseCase", () => {
  let repo: FlowRepositoryPort;

  beforeEach(() => {
    repo = createInMemoryFlowRepository();
  });

  it("should list flows with pagination", async () => {
    await seedDraftFlow(repo, TENANT_A, { name: "Flow 1" });
    await seedDraftFlow(repo, TENANT_A, { name: "Flow 2" });
    await seedDraftFlow(repo, TENANT_A, { name: "Flow 3" });

    const useCase = createListFlowsUseCase({ flowRepository: repo });
    const result = await useCase.execute({ tenantId: TENANT_A, page: 1, limit: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.hasMore).toBe(true);
  });

  it("should filter by status", async () => {
    await seedDraftFlow(repo, TENANT_A, { status: "draft" });
    await seedDraftFlow(repo, TENANT_A, { status: "published" });

    const useCase = createListFlowsUseCase({ flowRepository: repo });
    const result = await useCase.execute({ tenantId: TENANT_A, status: "published" });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.status).toBe("published");
  });

  it("should not return flows from different tenant", async () => {
    await seedDraftFlow(repo, TENANT_A);

    const useCase = createListFlowsUseCase({ flowRepository: repo });
    const result = await useCase.execute({ tenantId: TENANT_B });

    expect(result.data).toHaveLength(0);
  });

  it("should clamp limit to MAX_LIMIT", async () => {
    const useCase = createListFlowsUseCase({ flowRepository: repo });
    const result = await useCase.execute({ tenantId: TENANT_A, limit: 999 });

    expect(result.limit).toBe(100);
  });
});

describe("DeleteFlowUseCase", () => {
  let repo: FlowRepositoryPort;

  beforeEach(() => {
    repo = createInMemoryFlowRepository();
  });

  it("should soft delete flow", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A);
    const useCase = createDeleteFlowUseCase({ flowRepository: repo });

    await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });

    const found = await repo.findById(TENANT_A, flow.id);
    expect(found).toBeNull();
  });

  it("should throw FLOW_NOT_FOUND when not found", async () => {
    const useCase = createDeleteFlowUseCase({ flowRepository: repo });

    await expect(
      useCase.execute({ tenantId: TENANT_A, flowId: createFlowId("nonexistent") }),
    ).rejects.toThrow(AppError);
  });
});

describe("PublishFlowUseCase", () => {
  let repo: FlowRepositoryPort;

  beforeEach(() => {
    repo = createInMemoryFlowRepository();
  });

  it("should publish flow with valid definition", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A);
    const useCase = createPublishFlowUseCase({ flowRepository: repo });

    const result = await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });

    expect(result.flow.status).toBe("published");
    expect(result.validation.isValid).toBe(true);
  });

  it("should throw FLOW_VALIDATION_FAILED when definition is invalid", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A, {
      definition: createInvalidFlowDefinition(),
    });
    const useCase = createPublishFlowUseCase({ flowRepository: repo });

    try {
      await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });
      expect.fail("Should have thrown");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("FLOW_VALIDATION_FAILED");
    }
  });

  it("should throw FLOW_INVALID_TRANSITION when flow is active", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A, { status: "active" });
    const useCase = createPublishFlowUseCase({ flowRepository: repo });

    await expect(useCase.execute({ tenantId: TENANT_A, flowId: flow.id })).rejects.toThrow(
      AppError,
    );
  });
});

describe("ActivateFlowUseCase", () => {
  let repo: FlowRepositoryPort;

  beforeEach(() => {
    repo = createInMemoryFlowRepository();
  });

  it("should activate a published flow", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A, { status: "published" });
    const useCase = createActivateFlowUseCase({ flowRepository: repo });

    const result = await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });

    expect(result.flow.status).toBe("active");
    expect(result.previousActiveFlow).toBeNull();
  });

  it("should deactivate previous active flow", async () => {
    const firstFlow = await seedDraftFlow(repo, TENANT_A, { status: "active", name: "First" });
    const secondFlow = await seedDraftFlow(repo, TENANT_A, { status: "published", name: "Second" });

    const useCase = createActivateFlowUseCase({ flowRepository: repo });
    const result = await useCase.execute({ tenantId: TENANT_A, flowId: secondFlow.id });

    expect(result.flow.status).toBe("active");
    expect(result.previousActiveFlow).not.toBeNull();
    expect(result.previousActiveFlow?.id).toBe(firstFlow.id);
    expect(result.previousActiveFlow?.status).toBe("published");
  });

  it("should throw FLOW_INVALID_TRANSITION when flow is draft", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A);
    const useCase = createActivateFlowUseCase({ flowRepository: repo });

    await expect(useCase.execute({ tenantId: TENANT_A, flowId: flow.id })).rejects.toThrow(
      AppError,
    );
  });
});

describe("GoLiveFlowUseCase", () => {
  let repo: FlowRepositoryPort;

  beforeEach(() => {
    repo = createInMemoryFlowRepository();
  });

  it("should validate, publish and activate a draft flow in one call", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A);
    const useCase = createGoLiveFlowUseCase({ flowRepository: repo });

    const result = await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });

    expect(result.flow.status).toBe("active");
    expect(result.validation.isValid).toBe(true);
    expect(result.previousActiveFlow).toBeNull();
  });

  it("should activate a published flow without re-publishing", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A, { status: "published" });
    const useCase = createGoLiveFlowUseCase({ flowRepository: repo });

    const result = await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });

    expect(result.flow.status).toBe("active");
    expect(result.validation.isValid).toBe(true);
  });

  it("should deactivate the previous active flow", async () => {
    const firstFlow = await seedDraftFlow(repo, TENANT_A, { status: "active", name: "First" });
    const secondFlow = await seedDraftFlow(repo, TENANT_A, { name: "Second" });

    const useCase = createGoLiveFlowUseCase({ flowRepository: repo });
    const result = await useCase.execute({ tenantId: TENANT_A, flowId: secondFlow.id });

    expect(result.flow.status).toBe("active");
    expect(result.previousActiveFlow?.id).toBe(firstFlow.id);
    expect(result.previousActiveFlow?.status).toBe("published");
  });

  it("should throw FLOW_VALIDATION_FAILED when definition is invalid", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A, {
      definition: createInvalidFlowDefinition(),
    });
    const useCase = createGoLiveFlowUseCase({ flowRepository: repo });

    try {
      await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });
      expect.fail("Should have thrown");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("FLOW_VALIDATION_FAILED");
    }

    const found = await repo.findById(TENANT_A, flow.id);
    expect(found?.status).toBe("draft");
  });

  it("should be idempotent when the flow is already active", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A, { status: "active" });
    const useCase = createGoLiveFlowUseCase({ flowRepository: repo });

    const result = await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });

    expect(result.flow.status).toBe("active");
    expect(result.previousActiveFlow).toBeNull();
  });

  it("should throw FLOW_INVALID_TRANSITION when flow is archived", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A, { status: "archived" });
    const useCase = createGoLiveFlowUseCase({ flowRepository: repo });

    await expect(useCase.execute({ tenantId: TENANT_A, flowId: flow.id })).rejects.toThrow(
      AppError,
    );
  });

  it("should throw FLOW_NOT_FOUND when flow does not exist", async () => {
    const useCase = createGoLiveFlowUseCase({ flowRepository: repo });

    await expect(
      useCase.execute({ tenantId: TENANT_A, flowId: createFlowId("nonexistent") }),
    ).rejects.toThrow(AppError);
  });
});

describe("DeactivateFlowUseCase", () => {
  let repo: FlowRepositoryPort;

  beforeEach(() => {
    repo = createInMemoryFlowRepository();
  });

  it("should deactivate an active flow to published", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A, { status: "active" });
    const useCase = createDeactivateFlowUseCase({ flowRepository: repo });

    const result = await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });

    expect(result.flow.status).toBe("published");
  });

  it("should throw FLOW_INVALID_TRANSITION when flow is draft", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A, { status: "draft" });
    const useCase = createDeactivateFlowUseCase({ flowRepository: repo });

    await expect(useCase.execute({ tenantId: TENANT_A, flowId: flow.id })).rejects.toThrow(
      AppError,
    );
  });
});

describe("ArchiveFlowUseCase", () => {
  let repo: FlowRepositoryPort;

  beforeEach(() => {
    repo = createInMemoryFlowRepository();
  });

  it("should archive a draft flow", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A);
    const useCase = createArchiveFlowUseCase({ flowRepository: repo });

    await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });

    const found = await repo.findById(TENANT_A, flow.id);
    expect(found).toBeNull();
  });

  it("should archive a published flow", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A, { status: "published" });
    const useCase = createArchiveFlowUseCase({ flowRepository: repo });

    await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });

    const found = await repo.findById(TENANT_A, flow.id);
    expect(found).toBeNull();
  });

  it("should archive an active flow", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A, { status: "active" });
    const useCase = createArchiveFlowUseCase({ flowRepository: repo });

    await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });

    const found = await repo.findById(TENANT_A, flow.id);
    expect(found).toBeNull();
  });
});

describe("ValidateFlowUseCase", () => {
  let repo: FlowRepositoryPort;

  beforeEach(() => {
    repo = createInMemoryFlowRepository();
  });

  it("should return valid result for valid definition", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A);
    const useCase = createValidateFlowUseCase({ flowRepository: repo });

    const result = await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });

    expect(result.validation.isValid).toBe(true);
    expect(result.validation.issues).toHaveLength(0);
  });

  it("should return invalid result for invalid definition", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A, {
      definition: createInvalidFlowDefinition(),
    });
    const useCase = createValidateFlowUseCase({ flowRepository: repo });

    const result = await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });

    expect(result.validation.isValid).toBe(false);
    expect(result.validation.issues.length).toBeGreaterThan(0);
  });

  it("should not change flow status", async () => {
    const flow = await seedDraftFlow(repo, TENANT_A);
    const useCase = createValidateFlowUseCase({ flowRepository: repo });

    await useCase.execute({ tenantId: TENANT_A, flowId: flow.id });

    const found = await repo.findById(TENANT_A, flow.id);
    expect(found?.status).toBe("draft");
  });
});
