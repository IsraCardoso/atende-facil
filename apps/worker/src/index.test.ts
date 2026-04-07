/** Testes do worker — validacao de env e contrato do consumer. */
import { describe, expect, it } from "vitest";

import { loadWorkerEnvironment } from "./config/env";
import { createHealthCheckConsumer } from "./consumers/health-check-consumer";

describe("WorkerEnvironment", () => {
  it("should throw when REDIS_URL is missing", () => {
    const original = process.env.REDIS_URL;
    delete process.env.REDIS_URL;

    expect(() => loadWorkerEnvironment()).toThrow("REDIS_URL is required");

    process.env.REDIS_URL = original;
  });

  it("should load environment with defaults", () => {
    const original = process.env.REDIS_URL;
    process.env.REDIS_URL = "redis://localhost:6379";

    const env = loadWorkerEnvironment();

    expect(env.redisUrl).toBe("redis://localhost:6379");
    expect(env.nodeEnv).toBeDefined();

    process.env.REDIS_URL = original;
  });
});

describe("HealthCheckConsumer", () => {
  it("should return config with queue name and concurrency", () => {
    const consumer = createHealthCheckConsumer();
    const config = consumer.getConfig();

    expect(config.queueName).toBe("health-check");
    expect(config.concurrency).toBe(1);
  });

  it("should process job and return latency info", async () => {
    const consumer = createHealthCheckConsumer();
    const mockJob = { data: { timestamp: Date.now() - 50 } } as never;

    const result = await consumer.processJob(mockJob);

    expect(result).toContain("health check ok");
    expect(result).toContain("latency");
  });

  it("should handle failure without throwing", () => {
    const consumer = createHealthCheckConsumer();
    expect(() => consumer.onFailed(undefined, new Error("test"))).not.toThrow();
  });
});
