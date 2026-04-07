/** Configuracao do worker. Carrega variaveis de ambiente obrigatorias para conexao Valkey e logs. */

type WorkerEnvironment = Readonly<{
  redisUrl: string;
  nodeEnv: "development" | "staging" | "production";
  logLevel: "debug" | "info" | "warn" | "error";
}>;

export function loadWorkerEnvironment(): WorkerEnvironment {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is required for worker startup.");
  }

  const nodeEnv = (process.env.NODE_ENV as WorkerEnvironment["nodeEnv"]) ?? "development";
  const logLevel = (process.env.LOG_LEVEL as WorkerEnvironment["logLevel"]) ?? "info";

  return { redisUrl, nodeEnv, logLevel };
}

export type { WorkerEnvironment };
