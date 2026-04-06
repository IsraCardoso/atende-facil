type RuntimeEnvironment = "development" | "staging" | "production";
type LoggerLevel = "debug" | "info" | "warn" | "error";

type ApiEnvironment = Readonly<{
  nodeEnv: RuntimeEnvironment;
  apiHost: string;
  apiPort: number;
  databaseUrl: string;
  redisUrl: string;
  logLevel: LoggerLevel;
}>;

type RuntimeEnvMap = Readonly<Record<string, string | undefined>>;

declare const process:
  | Readonly<{
      env?: Record<string, string | undefined>;
    }>
  | undefined;
declare const Bun:
  | Readonly<{
      env?: Record<string, string | undefined>;
    }>
  | undefined;

function getRuntimeEnvMap(): RuntimeEnvMap {
  if (process?.env) {
    return process.env;
  }

  if (Bun?.env) {
    return Bun.env;
  }

  return {};
}

function readRequiredEnvVariable(name: string, source: RuntimeEnvMap): string {
  const value = source[name]?.trim();

  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}.`);
  }

  return value;
}

function parseRuntimeEnvironment(rawValue: string): RuntimeEnvironment {
  if (rawValue === "development") {
    return rawValue;
  }

  if (rawValue === "staging") {
    return rawValue;
  }

  if (rawValue === "production") {
    return rawValue;
  }

  throw new Error(
    `NODE_ENV inválido: ${rawValue}. Valores aceitos: development, staging, production.`,
  );
}

function parseLoggerLevel(rawValue: string): LoggerLevel {
  if (rawValue === "debug") {
    return rawValue;
  }

  if (rawValue === "info") {
    return rawValue;
  }

  if (rawValue === "warn") {
    return rawValue;
  }

  if (rawValue === "error") {
    return rawValue;
  }

  throw new Error(`LOG_LEVEL inválido: ${rawValue}. Valores aceitos: debug, info, warn, error.`);
}

function parseApiPort(rawValue: string): number {
  const parsedPort = Number(rawValue);

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error(`API_PORT inválida: ${rawValue}. Informe um inteiro entre 1 e 65535.`);
  }

  return parsedPort;
}

export function loadApiEnvironment(source: RuntimeEnvMap = getRuntimeEnvMap()): ApiEnvironment {
  return {
    nodeEnv: parseRuntimeEnvironment(readRequiredEnvVariable("NODE_ENV", source)),
    apiHost: readRequiredEnvVariable("API_HOST", source),
    apiPort: parseApiPort(readRequiredEnvVariable("API_PORT", source)),
    databaseUrl: readRequiredEnvVariable("DATABASE_URL", source),
    redisUrl: readRequiredEnvVariable("REDIS_URL", source),
    logLevel: parseLoggerLevel(readRequiredEnvVariable("LOG_LEVEL", source)),
  };
}

export type { ApiEnvironment, LoggerLevel, RuntimeEnvironment };
