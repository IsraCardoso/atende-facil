import { describe, expect, it } from "vitest";

import { loadApiEnvironment } from "./env";

describe("loadApiEnvironment", () => {
  it("should parse valid environment map", () => {
    const environment = loadApiEnvironment({
      NODE_ENV: "development",
      API_HOST: "127.0.0.1",
      API_PORT: "3000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/spec_driven_dev",
      REDIS_URL: "redis://localhost:6379",
      LOG_LEVEL: "debug",
      MULTI_TENANT: "true",
      DEFAULT_TENANT_ID: "",
      AUTH_SECRET: "secret-example",
      AUTH_TOKEN_TTL_SECONDS: "3600",
    });

    expect(environment.nodeEnv).toBe("development");
    expect(environment.apiPort).toBe(3000);
    expect(environment.logLevel).toBe("debug");
    expect(environment.multiTenant).toBe(true);
    expect(environment.authTokenTtlSeconds).toBe(3600);
  });

  it("should throw explicit error when required variable is missing", () => {
    expect(() =>
      loadApiEnvironment({
        API_HOST: "127.0.0.1",
      }),
    ).toThrowError("Variável de ambiente obrigatória ausente: NODE_ENV.");
  });

  it("should require default tenant id when multi-tenant is disabled", () => {
    expect(() =>
      loadApiEnvironment({
        NODE_ENV: "development",
        API_HOST: "127.0.0.1",
        API_PORT: "3000",
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/spec_driven_dev",
        REDIS_URL: "redis://localhost:6379",
        LOG_LEVEL: "debug",
        MULTI_TENANT: "false",
        DEFAULT_TENANT_ID: "",
        AUTH_SECRET: "secret-example",
        AUTH_TOKEN_TTL_SECONDS: "3600",
      }),
    ).toThrowError("DEFAULT_TENANT_ID é obrigatório quando MULTI_TENANT=false.");
  });
});
