/** Bootstrap do worker. Conecta ao Valkey via BullMQ, registra consumers e shutdown gracioso. */
import { Worker as BullMQWorker } from "bullmq";

import { loadWorkerEnvironment } from "./config/env";
import { createHealthCheckConsumer } from "./consumers/health-check-consumer";

export function bootstrapWorker() {
  const env = loadWorkerEnvironment();

  const healthConsumer = createHealthCheckConsumer();
  const config = healthConsumer.getConfig();

  const worker = new BullMQWorker(config.queueName, async (job) => healthConsumer.processJob(job), {
    connection: { url: env.redisUrl },
    concurrency: config.concurrency,
  });

  worker.on("failed", (job, error) => {
    healthConsumer.onFailed(job, error);
  });

  worker.on("ready", () => {
    /* startup signal — logged by BullMQ internally */
  });

  function gracefulShutdown(signal: string) {
    worker
      .close()
      .then(() => {
        process.exit(0);
      })
      .catch((err) => {
        process.exit(1);
      });
  }

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  return { worker, env };
}

bootstrapWorker();
