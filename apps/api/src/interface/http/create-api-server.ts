/** Bootstrap do servidor Elysia. Compõe middleware global (CORS, error handling, correlation-id) com rotas de auth e webhook. */
import { Elysia } from "elysia";

import { createAppError, isAppError, toAppErrorPayload } from "../../application/errors/app-error";
import type { createChatwootAccessService } from "../../application/services/chatwoot-access-service";
import type {
  CreateUserUseCase,
  DeactivateTenantMemberUseCase,
  GetCurrentUserUseCase,
  LoginUseCase,
  RegisterTenantUseCase,
  RemoveTenantMemberUseCase,
  VerifyAccessTokenUseCase,
} from "../../application/use-cases";
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
import type { GetChatwootSsoUrlUseCase } from "../../application/use-cases/get-chatwoot-sso-url-use-case";
import type { createGetConversationUseCase } from "../../application/use-cases/get-conversation-use-case";
import type { GetIntegrationOperationalSummaryUseCase } from "../../application/use-cases/integration";
import type { createListConversationsUseCase } from "../../application/use-cases/list-conversations-use-case";
import type {
  ProcessIncomingMessageInput,
  ProcessIncomingMessageResult,
} from "../../application/use-cases/process-incoming-message-use-case";
import type {
  CreateScheduleUseCase,
  DeleteScheduleUseCase,
  ListSchedulesUseCase,
  UpdateScheduleUseCase,
} from "../../application/use-cases/schedules";
import type { createSyncChatwootMessageUseCase } from "../../application/use-cases/sync-chatwoot-message-use-case";
import type { createSyncChatwootStatusUseCase } from "../../application/use-cases/sync-chatwoot-status-use-case";
import type {
  DeactivateWhatsAppIntegrationUseCase,
  DisconnectWhatsAppUseCase,
  GetWhatsAppConnectionStatusUseCase,
  ListWhatsAppInstancesUseCase,
  StartWhatsAppPairingUseCase,
  UpsertWhatsAppInstanceUseCase,
} from "../../application/use-cases/whatsapp-integration";
import type { AppLoggerPort, AuthTokenPort } from "../../domain/ports/auth-ports";
import type {
  SessionRepositoryPort,
  WhatsAppInstanceRepositoryPort,
} from "../../domain/ports/whatsapp-ports";
import type { ApiEnvironment } from "../../infrastructure/config/env";
import type { StructuredLogger } from "../../infrastructure/logger/json-logger";
import type { ConnectionManager } from "../ws/connection-manager";
import { createConversationWs } from "../ws/conversation-ws";
import { createAuthRoutes } from "./auth-routes";
import { createChatwootWebhookRoutes } from "./chatwoot-webhook-routes";
import { createConversationRoutes } from "./conversation-routes";
import { correlationIdHeaderName, resolveCorrelationId } from "./correlation-id";
import { createFlowRoutes } from "./flow-routes";
import { createIntegrationRoutes } from "./integration-routes";
import { rateLimitPlugin } from "./rate-limit-middleware";
import { createScheduleRoutes } from "./schedule-routes";
import { createTenantRoutes } from "./tenant-routes";
import { createWebhookRoutes } from "./webhook-routes";

type CreateApiServerAuthDependencies = Readonly<{
  registerTenantUseCase: RegisterTenantUseCase;
  createUserUseCase: CreateUserUseCase;
  loginUseCase: LoginUseCase;
  getCurrentUserUseCase: GetCurrentUserUseCase;
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase;
  deactivateTenantMemberUseCase: DeactivateTenantMemberUseCase;
  removeTenantMemberUseCase: RemoveTenantMemberUseCase;
}>;

type CreateApiServerWhatsAppIntegrationDependencies = Readonly<{
  listInstances: ListWhatsAppInstancesUseCase;
  upsertInstance: UpsertWhatsAppInstanceUseCase;
  getConnectionStatus: GetWhatsAppConnectionStatusUseCase;
  startPairing: StartWhatsAppPairingUseCase;
  disconnect: DisconnectWhatsAppUseCase;
  deactivate: DeactivateWhatsAppIntegrationUseCase;
  getOperationalSummary: GetIntegrationOperationalSummaryUseCase;
}>;

type CreateApiServerWhatsAppDependencies = Readonly<{
  instanceRepository: WhatsAppInstanceRepositoryPort;
  processIncomingMessage: Readonly<{
    execute: (input: ProcessIncomingMessageInput) => Promise<ProcessIncomingMessageResult>;
  }>;
  logger: AppLoggerPort;
  integration?: CreateApiServerWhatsAppIntegrationDependencies;
}>;

type CreateApiServerConversationDependencies = Readonly<{
  syncChatwootMessage: ReturnType<typeof createSyncChatwootMessageUseCase>;
  syncChatwootStatus: ReturnType<typeof createSyncChatwootStatusUseCase>;
  listConversations: ReturnType<typeof createListConversationsUseCase>;
  getConversation: ReturnType<typeof createGetConversationUseCase>;
  chatwootAccess: ReturnType<typeof createChatwootAccessService>;
  sessionRepository: SessionRepositoryPort;
  connectionManager: ConnectionManager;
  authTokenPort: AuthTokenPort;
  chatwootWebhookToken: string;
  logger: AppLoggerPort;
  getChatwootSsoUrl?: GetChatwootSsoUrlUseCase;
}>;

type CreateApiServerFlowDependencies = Readonly<{
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
}>;

type CreateApiServerScheduleDependencies = Readonly<{
  createSchedule: CreateScheduleUseCase;
  listSchedules: ListSchedulesUseCase;
  updateSchedule: UpdateScheduleUseCase;
  deleteSchedule: DeleteScheduleUseCase;
}>;

type CreateApiServerTenantDependencies = Readonly<{
  tenantRepository: import("../../domain/ports/auth-ports").TenantRepositoryPort;
}>;

type CreateApiServerInput = Readonly<{
  environment: ApiEnvironment;
  logger: StructuredLogger;
  auth: CreateApiServerAuthDependencies;
  whatsapp?: CreateApiServerWhatsAppDependencies;
  conversation?: CreateApiServerConversationDependencies;
  flow?: CreateApiServerFlowDependencies;
  schedule?: CreateApiServerScheduleDependencies;
  tenant?: CreateApiServerTenantDependencies;
}>;

type HealthResponse = Readonly<{
  status: "ok";
  environment: ApiEnvironment["nodeEnv"];
}>;

function createHealthResponse(environment: ApiEnvironment["nodeEnv"]): HealthResponse {
  return {
    status: "ok",
    environment,
  };
}

function resolveAllowedOrigin(
  requestOrigin: string | null,
  corsOrigins: readonly string[],
  nodeEnv: ApiEnvironment["nodeEnv"],
): string | null {
  if (requestOrigin && corsOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  if (nodeEnv === "development" && corsOrigins.length === 0) {
    return requestOrigin ?? "*";
  }

  return null;
}

function applyCorsHeaders(
  set: { headers: Record<string, string | number> },
  allowedOrigin: string | null,
): void {
  if (!allowedOrigin) {
    return;
  }

  set.headers["Access-Control-Allow-Origin"] = allowedOrigin;
  set.headers["Access-Control-Allow-Credentials"] = "true";
  set.headers["Access-Control-Allow-Headers"] =
    "Content-Type, Authorization, x-correlation-id, x-chatwoot-webhook-token";
  set.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
}

export function createApiServer(input: CreateApiServerInput) {
  const { environment, logger, auth, whatsapp, conversation, flow, schedule, tenant } = input;

  const app = new Elysia()
    .onBeforeHandle(({ request, set }) => {
      const requestOrigin = request.headers.get("origin");
      const allowedOrigin = resolveAllowedOrigin(
        requestOrigin,
        environment.corsOrigins,
        environment.nodeEnv,
      );
      applyCorsHeaders(set, allowedOrigin);

      if (request.method === "OPTIONS") {
        set.status = 204;
        return "";
      }

      return undefined;
    })
    .use(rateLimitPlugin())
    .onError(({ request, error, set }) => {
      const correlationId = resolveCorrelationId(request);
      set.headers[correlationIdHeaderName] = correlationId;

      if (isAppError(error)) {
        set.status = error.httpStatus;
        logger.warn("Erro de aplicação tratado.", {
          correlationId,
          context: {
            code: error.code,
            message: error.message,
            path: request.url,
            method: request.method,
          },
        });
        return toAppErrorPayload(error);
      }

      const internalError = createAppError("INTERNAL_UNEXPECTED_ERROR", "Erro interno inesperado.");
      set.status = internalError.httpStatus;
      logger.error("Erro inesperado não tratado.", {
        correlationId,
        context: {
          path: request.url,
          method: request.method,
          reason: error instanceof Error ? error.message : "Erro desconhecido.",
        },
      });
      return toAppErrorPayload(internalError);
    })
    .get("/health", ({ request, set }) => {
      const correlationId = resolveCorrelationId(request);
      const responsePayload = createHealthResponse(environment.nodeEnv);

      set.status = 200;
      set.headers[correlationIdHeaderName] = correlationId;

      logger.info("Healthcheck processado com sucesso.", {
        correlationId,
        context: {
          path: request.url,
          method: request.method,
        },
      });

      return responsePayload;
    })
    .use(
      createAuthRoutes({
        registerTenantUseCase: auth.registerTenantUseCase,
        createUserUseCase: auth.createUserUseCase,
        loginUseCase: auth.loginUseCase,
        getCurrentUserUseCase: auth.getCurrentUserUseCase,
        verifyAccessTokenUseCase: auth.verifyAccessTokenUseCase,
        deactivateTenantMemberUseCase: auth.deactivateTenantMemberUseCase,
        removeTenantMemberUseCase: auth.removeTenantMemberUseCase,
      }),
    );

  if (whatsapp) {
    app.use(
      createWebhookRoutes({
        instanceRepository: whatsapp.instanceRepository,
        processIncomingMessage: whatsapp.processIncomingMessage,
        logger: whatsapp.logger,
      }),
    );
  }

  if (conversation) {
    app
      .use(
        createChatwootWebhookRoutes({
          syncMessage: conversation.syncChatwootMessage,
          syncStatus: conversation.syncChatwootStatus,
          logger: conversation.logger,
          webhookToken: conversation.chatwootWebhookToken,
        }),
      )
      .use(
        createConversationRoutes({
          listConversations: conversation.listConversations,
          getConversation: conversation.getConversation,
          chatwootAccess: conversation.chatwootAccess,
          sessionRepository: conversation.sessionRepository,
          verifyAccessTokenUseCase: auth.verifyAccessTokenUseCase,
          ...(conversation.getChatwootSsoUrl
            ? { getChatwootSsoUrl: conversation.getChatwootSsoUrl }
            : {}),
        }),
      )
      .use(
        createIntegrationRoutes({
          chatwootAccess: conversation.chatwootAccess,
          verifyAccessTokenUseCase: auth.verifyAccessTokenUseCase,
          ...(conversation.getChatwootSsoUrl
            ? { getChatwootSsoUrl: conversation.getChatwootSsoUrl }
            : {}),
          ...(tenant?.tenantRepository ? { tenantRepository: tenant.tenantRepository } : {}),
          ...(whatsapp?.integration?.getOperationalSummary
            ? { getOperationalSummary: whatsapp.integration.getOperationalSummary }
            : {}),
          ...(tenant?.tenantRepository && whatsapp?.integration
            ? { whatsapp: whatsapp.integration }
            : {}),
        }),
      )
      .use(
        createConversationWs({
          connectionManager: conversation.connectionManager,
          authTokenPort: conversation.authTokenPort,
        }),
      );
  }

  if (flow) {
    app.use(
      createFlowRoutes({
        ...flow,
        verifyAccessTokenUseCase: auth.verifyAccessTokenUseCase,
      }),
    );
  }

  if (schedule) {
    app.use(
      createScheduleRoutes({
        ...schedule,
        verifyAccessTokenUseCase: auth.verifyAccessTokenUseCase,
      }),
    );
  }

  if (tenant) {
    app.use(
      createTenantRoutes({
        tenantRepository: tenant.tenantRepository,
        verifyAccessTokenUseCase: auth.verifyAccessTokenUseCase,
      }),
    );
  }

  return app;
}
