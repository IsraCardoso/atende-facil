import { describe, expect, it, vi } from "vitest";

import { createApiServer } from "./create-api-server";

describe("createApiServer", () => {
  it("should return healthcheck with status 200 and correlation id header", async () => {
    const infoLogSpy = vi.fn();
    const app = createApiServer({
      environment: {
        nodeEnv: "development",
        apiHost: "127.0.0.1",
        apiPort: 3000,
        databaseUrl: "postgresql://postgres:postgres@localhost:5432/spec_driven_dev",
        redisUrl: "redis://localhost:6379",
        logLevel: "debug",
      },
      logger: {
        debug: vi.fn(),
        info: infoLogSpy,
        warn: vi.fn(),
        error: vi.fn(),
      },
    });

    const response = await app.handle(new Request("http://localhost/health"));
    const payload = (await response.json()) as Readonly<Record<string, unknown>>;

    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBeTruthy();
    expect(payload).toEqual({
      status: "ok",
      environment: "development",
    });
    expect(infoLogSpy).toHaveBeenCalledTimes(1);
  });

  it("should preserve correlation id from request header", async () => {
    const infoLogSpy = vi.fn();
    const expectedCorrelationId = "req-correlation-123";
    const app = createApiServer({
      environment: {
        nodeEnv: "development",
        apiHost: "127.0.0.1",
        apiPort: 3000,
        databaseUrl: "postgresql://postgres:postgres@localhost:5432/spec_driven_dev",
        redisUrl: "redis://localhost:6379",
        logLevel: "debug",
      },
      logger: {
        debug: vi.fn(),
        info: infoLogSpy,
        warn: vi.fn(),
        error: vi.fn(),
      },
    });

    const response = await app.handle(
      new Request("http://localhost/health", {
        headers: {
          "x-correlation-id": expectedCorrelationId,
        },
      }),
    );

    expect(response.headers.get("x-correlation-id")).toBe(expectedCorrelationId);
    expect(infoLogSpy).toHaveBeenCalledWith(
      "Healthcheck processado com sucesso.",
      expect.objectContaining({
        correlationId: expectedCorrelationId,
      }),
    );
  });
});
