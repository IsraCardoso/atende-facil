/** Configuracao do worker. Carrega variaveis de ambiente obrigatorias para conexao Valkey e logs. */

type WorkerEnvironment = Readonly<{
  redisUrl: string;
  databaseUrl: string;
  nodeEnv: "development" | "staging" | "production";
  logLevel: "debug" | "info" | "warn" | "error";
}>;

export function loadWorkerEnvironment(): WorkerEnvironment {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    throw new Error("REDIS_URL is required for worker startup.");
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for worker startup.");
  }

  const nodeEnv = (process.env.NODE_ENV as WorkerEnvironment["nodeEnv"]) ?? "development";
  const logLevel = (process.env.LOG_LEVEL as WorkerEnvironment["logLevel"]) ?? "info";

  return { redisUrl, databaseUrl, nodeEnv, logLevel };
}

export type { WorkerEnvironment };
