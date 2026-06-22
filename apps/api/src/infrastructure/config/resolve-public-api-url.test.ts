import { describe, expect, it } from "vitest";

import type { ApiEnvironment } from "./env";
import { resolvePublicApiUrlForWebhooks } from "./resolve-public-api-url";

function buildEnv(overrides: Partial<ApiEnvironment>): ApiEnvironment {
  return {
    nodeEnv: "development",
    apiHost: "0.0.0.0",
    apiPort: 3000,
    databaseUrl: "postgresql://localhost/db",
    redisUrl: "redis://localhost:6379",
    logLevel: "debug",
    multiTenant: true,
    defaultTenantId: null,
    authSecret: "secret",
    authTokenTtlSeconds: 3600,
    chatwootApiUrl: null,
    chatwootApiToken: null,
    chatwootAccountId: null,
    chatwootInboxId: null,
    chatwootWebhookToken: null,
    chatwootAppUrl: null,
    chatwootSsoSecret: null,
    devMockWhatsappSend: false,
    corsOrigins: [],
    evolutionApiUrl: "http://localhost:8081",
    evolutionApiKey: "key",
    publicApiUrl: "http://localhost:3000",
    ...overrides,
  };
}

describe("resolvePublicApiUrlForWebhooks", () => {
  it("should rewrite localhost to host.docker.internal in development", () => {
    const result = resolvePublicApiUrlForWebhooks(buildEnv({}));

    expect(result).toBe("http://host.docker.internal:3000");
  });

  it("should keep explicit public URL in production", () => {
    const result = resolvePublicApiUrlForWebhooks(
      buildEnv({
        nodeEnv: "production",
        publicApiUrl: "https://api.example.com",
        evolutionApiUrl: "http://evolution:8080",
      }),
    );

    expect(result).toBe("https://api.example.com");
  });

  it("should keep custom PUBLIC_API_URL when not loopback in development", () => {
    const result = resolvePublicApiUrlForWebhooks(
      buildEnv({
        publicApiUrl: "https://tunnel.example.com",
      }),
    );

    expect(result).toBe("https://tunnel.example.com");
  });
});
