import type { DatabaseConfiguration, DatabaseUrl, ValkeyUrl } from "./types";

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

function createDatabaseUrl(rawValue: string): DatabaseUrl {
  if (rawValue.startsWith("postgres://") || rawValue.startsWith("postgresql://")) {
    return rawValue as DatabaseUrl;
  }

  throw new Error(
    `DATABASE_URL inválida: ${rawValue}. Deve iniciar com postgres:// ou postgresql://.`,
  );
}

function createValkeyUrl(rawValue: string): ValkeyUrl {
  if (rawValue.startsWith("redis://")) {
    return rawValue as ValkeyUrl;
  }

  throw new Error(`REDIS_URL inválida: ${rawValue}. Deve iniciar com redis://.`);
}

export function loadDatabaseConfiguration(
  source: RuntimeEnvMap = getRuntimeEnvMap(),
): DatabaseConfiguration {
  return {
    databaseUrl: createDatabaseUrl(readRequiredEnvVariable("DATABASE_URL", source)),
    valkeyUrl: createValkeyUrl(readRequiredEnvVariable("REDIS_URL", source)),
  };
}

export type { RuntimeEnvMap };
export { createDatabaseUrl, createValkeyUrl, readRequiredEnvVariable };
