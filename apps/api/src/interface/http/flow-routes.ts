/** Rotas HTTP de flows. CRUD e lifecycle com tenant isolation obrigatorio e input validation (RN-020, RN-025). */
import { Elysia, t } from "elysia";

import type { VerifyAccessTokenUseCase } from "../../application/use-cases";
import type {
  ActivateFlowUseCase,
  ArchiveFlowUseCase,
  CreateFlowUseCase,
  DeactivateFlowUseCase,
  DeleteFlowUseCase,
  GetFlowUseCase,
  GoLiveFlowUseCase,
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
  goLiveFlow: GoLiveFlowUseCase;
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
    goLiveFlow,
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
    .post(
      "/",
      async ({ authClaims, body, set }) => {
        set.status = 201;
        return createFlow.execute({
          tenantId: authClaims.tenantId,
          name: body.name,
          description: body.description ?? undefined,
        });
      },
      {
        body: t.Object({
          name: t.String({ minLength: 1 }),
          description: t.Optional(t.Union([t.String(), t.Null()])),
        }),
      },
    )
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
    .put(
      "/:id",
      async ({ authClaims, params, body }) =>
        updateFlowDefinition.execute({
          tenantId: authClaims.tenantId,
          flowId: createFlowId(params.id),
          name: body.name,
          description: body.description ?? undefined,
          definition: body.definition,
        }),
      {
        body: t.Object({
          name: t.Optional(t.String({ minLength: 1 })),
          description: t.Optional(t.Union([t.String(), t.Null()])),
          definition: t.Optional(
            t.Object({
              id: t.Optional(t.String()),
              tenantId: t.Optional(t.String()),
              startNodeId: t.String({ minLength: 1 }),
              nodes: t.Array(t.Any()),
              edges: t.Optional(t.Array(t.Any())),
              positions: t.Optional(t.Record(t.String(), t.Any())),
            }),
          ),
        }),
      },
    )
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
    .post("/:id/go-live", async ({ authClaims, params }) =>
      goLiveFlow.execute({
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
