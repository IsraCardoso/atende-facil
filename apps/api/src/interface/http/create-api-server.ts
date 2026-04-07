/** Bootstrap do servidor Elysia. Compõe middleware global (CORS, error handling, correlation-id) com rotas de auth e webhook. */
import { Elysia } from "elysia";

import { createAppError, isAppError, toAppErrorPayload } from "../../application/errors/app-error";
import type { createChatwootAccessService } from "../../application/services/chatwoot-access-service";
import type {
  CreateUserUseCase,
  GetCurrentUserUseCase,
  LoginUseCase,
  RegisterTenantUseCase,
  VerifyAccessTokenUseCase,
} from "../../application/use-cases";
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
import type {
  CreateScheduleUseCase,
  DeleteScheduleUseCase,
  ListSchedulesUseCase,
  UpdateScheduleUseCase,
} from "../../application/use-cases/schedules";
import type { createGetConversationUseCase } from "../../application/use-cases/get-conversation-use-case";
import type { createListConversationsUseCase } from "../../application/use-cases/list-conversations-use-case";
import type {
  ProcessIncomingMessageInput,
  ProcessIncomingMessageResult,
} from "../../application/use-cases/process-incoming-message-use-case";
import type { createSyncChatwootMessageUseCase } from "../../application/use-cases/sync-chatwoot-message-use-case";
import type { createSyncChatwootStatusUseCase } from "../../application/use-cases/sync-chatwoot-status-use-case";
import type { AppLoggerPort, AuthTokenPort } from "../../domain/ports/auth-ports";
import type { WhatsAppInstanceRepositoryPort } from "../../domain/ports/whatsapp-ports";
import type { ApiEnvironment } from "../../infrastructure/config/env";
import type { StructuredLogger } from "../../infrastructure/logger/json-logger";
import type { ConnectionManager } from "../ws/connection-manager";
import { createConversationWs } from "../ws/conversation-ws";
import { createAuthRoutes } from "./auth-routes";
import { createChatwootWebhookRoutes } from "./chatwoot-webhook-routes";
import { createConversationRoutes } from "./conversation-routes";
import { correlationIdHeaderName, resolveCorrelationId } from "./correlation-id";
import { createFlowRoutes } from "./flow-routes";
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
}>;

type CreateApiServerWhatsAppDependencies = Readonly<{
  instanceRepository: WhatsAppInstanceRepositoryPort;
  processIncomingMessage: Readonly<{
    execute: (input: ProcessIncomingMessageInput) => Promise<ProcessIncomingMessageResult>;
  }>;
  logger: AppLoggerPort;
}>;

type CreateApiServerConversationDependencies = Readonly<{
  syncChatwootMessage: ReturnType<typeof createSyncChatwootMessageUseCase>;
  syncChatwootStatus: ReturnType<typeof createSyncChatwootStatusUseCase>;
  listConversations: ReturnType<typeof createListConversationsUseCase>;
  getConversation: ReturnType<typeof createGetConversationUseCase>;
  chatwootAccess: ReturnType<typeof createChatwootAccessService>;
  connectionManager: ConnectionManager;
  authTokenPort: AuthTokenPort;
  chatwootWebhookToken: string;
  logger: AppLoggerPort;
}>;

type CreateApiServerFlowDependencies = Readonly<{
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

export function createApiServer(input: CreateApiServerInput) {
  const { environment, logger, auth, whatsapp, conversation, flow, schedule, tenant } = input;

  const app = new Elysia()
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
          verifyAccessTokenUseCase: auth.verifyAccessTokenUseCase,
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
