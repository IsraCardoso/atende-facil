/** Rotas HTTP de flows. CRUD e lifecycle com tenant isolation obrigatorio (RN-020). */
import { Elysia } from "elysia";

import type { VerifyAccessTokenUseCase } from "../../application/use-cases";
import type {
  ActivateFlowUseCase,
  ArchiveFlowUseCase,
  CreateFlowUseCase,
  DeactivateFlowUseCase,
  DeleteFlowUseCase,
  GetFlowUseCase,
  ListFlowsUseCase,
  PublishFlowUseCase,
  UpdateFlowDefinitionUseCase,
  ValidateFlowUseCase,
} from "../../application/use-cases/flows";
import { createFlowId } from "../../domain/flow-types";
import { authenticateRequest } from "./auth-middleware";
import { resolveCorrelationId } from "./correlation-id";

type CreateFlowRoutesInput = Readonly<{
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
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase;
}>;

export function createFlowRoutes(input: CreateFlowRoutesInput) {
  const {
    createFlow,
    updateFlowDefinition,
    getFlow,
    listFlows,
    deleteFlow,
    publishFlow,
    activateFlow,
    deactivateFlow,
    archiveFlow,
    validateFlow,
    verifyAccessTokenUseCase,
  } = input;

  return new Elysia({ prefix: "/flows" })
    .derive(async ({ request }) => {
      const authClaims = await authenticateRequest(request, verifyAccessTokenUseCase);
      const correlationId = resolveCorrelationId(request);
      return { authClaims, correlationId };
    })
    .post("/", async ({ authClaims, body, set }) => {
      const payload = body as Readonly<{ name?: string; description?: string }>;

      if (!payload.name?.trim()) {
        set.status = 400;
        return { error: "Nome do flow e obrigatorio.", code: "REQUEST_VALIDATION_ERROR" };
      }

      set.status = 201;
      return createFlow.execute({
        tenantId: authClaims.tenantId,
        name: payload.name,
        description: payload.description,
      });
    })
    .get("/", async ({ authClaims, query }) =>
      listFlows.execute({
        tenantId: authClaims.tenantId,
        status: (query.status as string) ?? undefined,
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      }),
    )
    .get("/:id", async ({ authClaims, params }) =>
      getFlow.execute({
        tenantId: authClaims.tenantId,
        flowId: createFlowId(params.id),
      }),
    )
    .put("/:id", async ({ authClaims, params, body }) => {
      const payload = body as Readonly<{
        name?: string;
        description?: string;
        definition?: Readonly<Record<string, unknown>>;
      }>;

      return updateFlowDefinition.execute({
        tenantId: authClaims.tenantId,
        flowId: createFlowId(params.id),
        name: payload.name,
        description: payload.description,
        definition: payload.definition,
      });
    })
    .delete("/:id", async ({ authClaims, params }) => {
      await deleteFlow.execute({
        tenantId: authClaims.tenantId,
        flowId: createFlowId(params.id),
      });
      return { success: true };
    })
    .post("/:id/publish", async ({ authClaims, params }) =>
      publishFlow.execute({
        tenantId: authClaims.tenantId,
        flowId: createFlowId(params.id),
      }),
    )
    .post("/:id/activate", async ({ authClaims, params }) =>
      activateFlow.execute({
        tenantId: authClaims.tenantId,
        flowId: createFlowId(params.id),
      }),
    )
    .post("/:id/deactivate", async ({ authClaims, params }) =>
      deactivateFlow.execute({
        tenantId: authClaims.tenantId,
        flowId: createFlowId(params.id),
      }),
    )
    .post("/:id/archive", async ({ authClaims, params }) => {
      await archiveFlow.execute({
        tenantId: authClaims.tenantId,
        flowId: createFlowId(params.id),
      });
      return { success: true };
    })
    .post("/:id/validate", async ({ authClaims, params }) =>
      validateFlow.execute({
        tenantId: authClaims.tenantId,
        flowId: createFlowId(params.id),
      }),
    );
}

export type { CreateFlowRoutesInput };
