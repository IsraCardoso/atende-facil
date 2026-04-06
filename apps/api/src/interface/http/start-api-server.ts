/** Inicialização do servidor HTTP. Configura host, porta e loga URL de acesso. */
import type { ApiEnvironment } from "../../infrastructure/config/env";
import type { StructuredLogger } from "../../infrastructure/logger/json-logger";
import { systemCorrelationId } from "./correlation-id";

type StartableApi = Readonly<{
  listen: (options: Readonly<{ hostname: string; port: number; reusePort?: boolean }>) => unknown;
}>;

type StartApiServerInput = Readonly<{
  app: StartableApi;
  environment: ApiEnvironment;
  logger: StructuredLogger;
}>;

type ErrorWithCode = Readonly<{
  code: string | undefined;
  message: string | undefined;
}>;

function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function toErrorWithCode(value: unknown): ErrorWithCode {
  if (!isObject(value)) {
    return {
      code: undefined,
      message: undefined,
    };
  }

  const code = typeof value.code === "string" ? value.code : undefined;
  const message = typeof value.message === "string" ? value.message : undefined;

  return {
    code,
    message,
  };
}

function isPortAlreadyInUseError(error: unknown): boolean {
  const parsedError = toErrorWithCode(error);

  if (parsedError.code === "EADDRINUSE") {
    return true;
  }

  return parsedError.message?.includes("EADDRINUSE") ?? false;
}

function getReadableErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Erro desconhecido durante inicialização da API.";
}

export function startApiServer(input: StartApiServerInput): void {
  const { app, environment, logger } = input;

  try {
    app.listen({
      hostname: environment.apiHost,
      port: environment.apiPort,
      reusePort: false,
    });

    logger.info("API iniciada com sucesso.", {
      correlationId: systemCorrelationId,
      context: {
        host: environment.apiHost,
        port: environment.apiPort,
        environment: environment.nodeEnv,
      },
    });
  } catch (error: unknown) {
    if (isPortAlreadyInUseError(error)) {
      const message = `Porta ${environment.apiPort} já está em uso. Encerrar o processo existente ou alterar API_PORT.`;

      logger.error(message, {
        correlationId: systemCorrelationId,
        context: {
          port: environment.apiPort,
        },
      });

      throw new Error(message);
    }

    logger.error("Falha ao iniciar API.", {
      correlationId: systemCorrelationId,
      context: {
        reason: getReadableErrorMessage(error),
      },
    });

    throw error;
  }
}
