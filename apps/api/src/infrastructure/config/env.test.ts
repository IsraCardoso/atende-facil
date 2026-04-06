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
    });

    expect(environment.nodeEnv).toBe("development");
    expect(environment.apiPort).toBe(3000);
    expect(environment.logLevel).toBe("debug");
  });

  it("should throw explicit error when required variable is missing", () => {
    expect(() =>
      loadApiEnvironment({
        API_HOST: "127.0.0.1",
      }),
    ).toThrowError("Variável de ambiente obrigatória ausente: NODE_ENV.");
  });
});
