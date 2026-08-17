import { describe, expect, it } from "vitest";

import type { ApiEnvironment } from "../config/env";
import {
  describeEvolutionPlatformAvailability,
  loadEvolutionPlatformConfig,
  toEvolutionPlatformConfig,
} from "./evolution-platform-config";

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
    chatwootPlatformToken: null,
    devMockWhatsappSend: false,
    corsOrigins: [],
    evolutionApiUrl: "http://localhost:8081",
    evolutionApiKey: "atende-facil-evo-key",
    publicApiUrl: "http://localhost:3000",
    ...overrides,
  };
}

describe("toEvolutionPlatformConfig", () => {
  it("should return config when url and key are present", () => {
    expect(toEvolutionPlatformConfig(buildEnv({}))).toEqual({
      apiUrl: "http://localhost:8081",
      apiKey: "atende-facil-evo-key",
    });
  });

  it("should return null when key is missing", () => {
    expect(toEvolutionPlatformConfig(buildEnv({ evolutionApiKey: null }))).toBeNull();
  });
});

describe("loadEvolutionPlatformConfig", () => {
  it("should return null when env map is empty", () => {
    expect(loadEvolutionPlatformConfig({})).toBeNull();
  });
});

describe("describeEvolutionPlatformAvailability", () => {
  it("should report available when configured", () => {
    expect(describeEvolutionPlatformAvailability(buildEnv({}))).toEqual({ available: true });
  });

  it("should report missing variables", () => {
    const result = describeEvolutionPlatformAvailability(
      buildEnv({ evolutionApiUrl: null, evolutionApiKey: null }),
    );

    expect(result.available).toBe(false);
    expect(result.reason).toContain("EVOLUTION_API_URL");
    expect(result.reason).toContain("EVOLUTION_API_KEY");
  });
});
