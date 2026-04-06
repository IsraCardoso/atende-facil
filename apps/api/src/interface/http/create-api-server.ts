import { Elysia } from "elysia";

import { createAppError, isAppError, toAppErrorPayload } from "../../application/errors/app-error";
import type {
  CreateUserUseCase,
  GetCurrentUserUseCase,
  LoginUseCase,
  RegisterTenantUseCase,
  VerifyAccessTokenUseCase,
} from "../../application/use-cases";
import type { ApiEnvironment } from "../../infrastructure/config/env";
import type { StructuredLogger } from "../../infrastructure/logger/json-logger";
import { createAuthRoutes } from "./auth-routes";
import { correlationIdHeaderName, resolveCorrelationId } from "./correlation-id";

type CreateApiServerAuthDependencies = Readonly<{
  registerTenantUseCase: RegisterTenantUseCase;
  createUserUseCase: CreateUserUseCase;
  loginUseCase: LoginUseCase;
  getCurrentUserUseCase: GetCurrentUserUseCase;
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase;
}>;

type CreateApiServerInput = Readonly<{
  environment: ApiEnvironment;
  logger: StructuredLogger;
  auth: CreateApiServerAuthDependencies;
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
  const { environment, logger, auth } = input;

  return new Elysia()
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
}
