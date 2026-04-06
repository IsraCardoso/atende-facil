import { Elysia } from "elysia";

import type { ApiEnvironment } from "../../infrastructure/config/env";
import type { StructuredLogger } from "../../infrastructure/logger/json-logger";
import { correlationIdHeaderName, resolveCorrelationId } from "./correlation-id";

type CreateApiServerInput = Readonly<{
  environment: ApiEnvironment;
  logger: StructuredLogger;
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
  const { environment, logger } = input;

  return new Elysia().get("/health", ({ request, set }) => {
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
  });
}
