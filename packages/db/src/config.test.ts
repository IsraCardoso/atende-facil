import { describe, expect, it } from "vitest";

import { createDatabaseUrl, createValkeyUrl, loadDatabaseConfiguration } from "./config";

describe("loadDatabaseConfiguration", () => {
  it("should create strongly typed urls when env values are valid", () => {
    const configuration = loadDatabaseConfiguration({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/spec_driven_dev",
      REDIS_URL: "redis://localhost:6379",
    });

    expect(configuration.databaseUrl).toBe(
      "postgresql://postgres:postgres@localhost:5432/spec_driven_dev",
    );
    expect(configuration.valkeyUrl).toBe("redis://localhost:6379");
  });

  it("should fail with explicit message when DATABASE_URL is missing", () => {
    expect(() =>
      loadDatabaseConfiguration({
        REDIS_URL: "redis://localhost:6379",
      }),
    ).toThrowError("Variável de ambiente obrigatória ausente: DATABASE_URL.");
  });
});

describe("createDatabaseUrl", () => {
  it("should reject unsupported database protocols", () => {
    expect(() => createDatabaseUrl("mysql://localhost")).toThrowError(
      "DATABASE_URL inválida: mysql://localhost. Deve iniciar com postgres:// ou postgresql://.",
    );
  });
});

describe("createValkeyUrl", () => {
  it("should reject unsupported valkey protocols", () => {
    expect(() => createValkeyUrl("valkey://localhost")).toThrowError(
      "REDIS_URL inválida: valkey://localhost. Deve iniciar com redis://.",
    );
  });
});
