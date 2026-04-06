import { loadApiEnvironment } from "./infrastructure/config/env";
import { createJsonLogger, type StructuredLogger } from "./infrastructure/logger/json-logger";
import { createApiServer } from "./interface/http/create-api-server";
import { startApiServer } from "./interface/http/start-api-server";

export type ApiRuntime = Readonly<{
  app: ReturnType<typeof createApiServer>;
  logger: StructuredLogger;
}>;

export function bootstrapApi(): ApiRuntime {
  const env = loadApiEnvironment();
  const logger = createJsonLogger({
    environment: env.nodeEnv,
    minimumLevel: env.logLevel,
  });
  const app = createApiServer({
    environment: env,
    logger,
  });

  startApiServer({
    app,
    environment: env,
    logger,
  });

  return {
    app,
    logger,
  };
}

bootstrapApi();
