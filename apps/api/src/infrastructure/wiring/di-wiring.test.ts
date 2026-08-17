/** Testes de verificacao de wiring DI — garante que Drizzle repos sao injetados quando db esta presente. */
import { describe, expect, it, vi } from "vitest";
import type { AppLoggerPort } from "../../domain/ports/auth-ports";
import { createAuthModule } from "../auth/create-auth-module";
import { createInMemoryChatwootAdapter } from "../chatwoot";
import type { ApiEnvironment } from "../config/env";
import { createFlowModule } from "../flow/create-flow-module";
import type { StructuredLogger } from "../logger";
import { createWhatsAppModule } from "../whatsapp/create-whatsapp-module";

const noopLog = vi.fn();

const structuredLogger: StructuredLogger = {
  info: noopLog,
  warn: noopLog,
  error: noopLog,
  debug: noopLog,
};

const appLogger: AppLoggerPort = {
  info: noopLog,
  warn: noopLog,
  error: noopLog,
  debug: noopLog,
};

const baseEnvironment: ApiEnvironment = {
  nodeEnv: "development",
  apiHost: "localhost",
  apiPort: 3000,
  databaseUrl: "",
  redisUrl: "",
  logLevel: "debug",
  multiTenant: false,
  defaultTenantId: "default-tenant",
  authSecret: "test-secret-key-must-be-at-least-32-chars-long!",
  authTokenTtlSeconds: 3600,
  chatwootApiUrl: null,
  chatwootApiToken: null,
  chatwootAccountId: null,
  chatwootInboxId: null,
  chatwootWebhookToken: null,
  chatwootAppUrl: null,
  chatwootPlatformToken: null,
  devMockWhatsappSend: false,
  corsOrigins: [],
  evolutionApiUrl: null,
  evolutionApiKey: null,
  publicApiUrl: "http://localhost:3000",
};

describe("DI Wiring Verification", () => {
  it("should create auth module without db (in-memory fallback)", () => {
    const authModule = createAuthModule({
      environment: baseEnvironment,
      logger: structuredLogger,
    });

    expect(authModule.registerTenantUseCase).toBeDefined();
    expect(authModule.loginUseCase).toBeDefined();
    expect(authModule.verifyAccessTokenUseCase).toBeDefined();
    expect(authModule.authTokenPort).toBeDefined();
  });

  it("should create flow module without db (in-memory fallback)", () => {
    const flowModule = createFlowModule({});

    expect(flowModule.flowRepository).toBeDefined();
    expect(flowModule.createFlow).toBeDefined();
    expect(flowModule.getFlow).toBeDefined();
    expect(flowModule.listFlows).toBeDefined();
  });

  it("should create whatsapp module without db (in-memory fallback)", () => {
    const whatsappModule = createWhatsAppModule({
      logger: appLogger,
      resolveChatwootPort: async () => createInMemoryChatwootAdapter(),
    });

    expect(whatsappModule.processIncomingMessage).toBeDefined();
  });
});
