/** Consumer de health check. Job de exemplo para validar pipeline BullMQ. */
import type { Job } from "bullmq";

import type { BaseConsumer } from "./base-consumer";

type HealthCheckPayload = Readonly<{
  timestamp: number;
}>;

export function createHealthCheckConsumer(): BaseConsumer<HealthCheckPayload, string> {
  return {
    getConfig() {
      return { queueName: "health-check", concurrency: 1 };
    },

    async processJob(job: Job<HealthCheckPayload>): Promise<string> {
      const elapsed = Date.now() - job.data.timestamp;
      return `health check ok — latency ${elapsed}ms`;
    },

    onFailed(_job, error) {
      /* logged by the worker infrastructure */
    },
  };
}
