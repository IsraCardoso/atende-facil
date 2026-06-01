/** Carregamento e validação de variáveis de ambiente. Falha rápido se configuração obrigatória estiver ausente. */
type RuntimeEnvironment = "development" | "staging" | "production";
type LoggerLevel = "debug" | "info" | "warn" | "error";

type ApiEnvironment = Readonly<{
  nodeEnv: RuntimeEnvironment;
  apiHost: string;
  apiPort: number;
  databaseUrl: string;
  redisUrl: string;
  logLevel: LoggerLevel;
  multiTenant: boolean;
  defaultTenantId: string | null;
  authSecret: string;
  authTokenTtlSeconds: number;
  chatwootApiUrl: string | null;
  chatwootApiToken: string | null;
  chatwootAccountId: string | null;
  chatwootInboxId: string | null;
  chatwootWebhookToken: string | null;
  chatwootAppUrl: string | null;
  chatwootSsoSecret: string | null;
  devMockWhatsappSend: boolean;
  corsOrigins: readonly string[];
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

function readOptionalEnvVariable(name: string, source: RuntimeEnvMap): string | undefined {
  const value = source[name]?.trim();

  if (!value) {
    return undefined;
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

function parseBooleanValue(rawValue: string, variableName: string): boolean {
  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  throw new Error(`${variableName} inválido: ${rawValue}. Valores aceitos: true, false.`);
}

function parseCorsOrigins(rawValue: string | undefined): readonly string[] {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function assertProductionRuntimeConstraints(environment: ApiEnvironment): void {
  if (environment.nodeEnv === "development") {
    return;
  }

  if (environment.devMockWhatsappSend) {
    throw new Error("DEV_MOCK_WHATSAPP_SEND=true não é permitido em staging/production.");
  }
}

function parseAuthTokenTtlSeconds(rawValue: string): number {
  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue < 60) {
    throw new Error(
      `AUTH_TOKEN_TTL_SECONDS inválido: ${rawValue}. Informe um inteiro maior ou igual a 60.`,
    );
  }

  return parsedValue;
}

export function loadApiEnvironment(source: RuntimeEnvMap = getRuntimeEnvMap()): ApiEnvironment {
  const nodeEnv = parseRuntimeEnvironment(readRequiredEnvVariable("NODE_ENV", source));
  const apiHost = readRequiredEnvVariable("API_HOST", source);
  const apiPort = parseApiPort(readRequiredEnvVariable("API_PORT", source));
  const databaseUrl = readRequiredEnvVariable("DATABASE_URL", source);
  const redisUrl = readRequiredEnvVariable("REDIS_URL", source);
  const logLevel = parseLoggerLevel(readRequiredEnvVariable("LOG_LEVEL", source));
  const multiTenant = parseBooleanValue(
    readRequiredEnvVariable("MULTI_TENANT", source),
    "MULTI_TENANT",
  );
  const defaultTenantId = readOptionalEnvVariable("DEFAULT_TENANT_ID", source) ?? null;
  const authSecret = readRequiredEnvVariable("AUTH_SECRET", source);
  const authTokenTtlSeconds = parseAuthTokenTtlSeconds(
    readRequiredEnvVariable("AUTH_TOKEN_TTL_SECONDS", source),
  );

  if (!multiTenant && !defaultTenantId) {
    throw new Error("DEFAULT_TENANT_ID é obrigatório quando MULTI_TENANT=false.");
  }

  const chatwootApiUrl = readOptionalEnvVariable("CHATWOOT_API_URL", source) ?? null;
  const chatwootApiToken = readOptionalEnvVariable("CHATWOOT_API_TOKEN", source) ?? null;
  const chatwootAccountId = readOptionalEnvVariable("CHATWOOT_ACCOUNT_ID", source) ?? null;
  const chatwootInboxId = readOptionalEnvVariable("CHATWOOT_INBOX_ID", source) ?? null;
  const chatwootWebhookToken = readOptionalEnvVariable("CHATWOOT_WEBHOOK_TOKEN", source) ?? null;
  const chatwootAppUrl = readOptionalEnvVariable("CHATWOOT_APP_URL", source) ?? null;
  const chatwootSsoSecret = readOptionalEnvVariable("CHATWOOT_SSO_SECRET", source) ?? null;
  const devMockWhatsappSendRaw = readOptionalEnvVariable("DEV_MOCK_WHATSAPP_SEND", source);
  const devMockWhatsappSend =
    devMockWhatsappSendRaw !== undefined
      ? parseBooleanValue(devMockWhatsappSendRaw, "DEV_MOCK_WHATSAPP_SEND")
      : nodeEnv === "development";

  const corsOrigins = parseCorsOrigins(readOptionalEnvVariable("CORS_ORIGINS", source));

  const environment: ApiEnvironment = {
    nodeEnv,
    apiHost,
    apiPort,
    databaseUrl,
    redisUrl,
    logLevel,
    multiTenant,
    defaultTenantId,
    authSecret,
    authTokenTtlSeconds,
    chatwootApiUrl,
    chatwootApiToken,
    chatwootAccountId,
    chatwootInboxId,
    chatwootWebhookToken,
    chatwootAppUrl,
    chatwootSsoSecret,
    devMockWhatsappSend,
    corsOrigins,
  };

  assertProductionRuntimeConstraints(environment);

  return environment;
}

export type { ApiEnvironment, LoggerLevel, RuntimeEnvironment };
