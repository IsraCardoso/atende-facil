/** Bootstrap do worker. Conecta ao Valkey via BullMQ, registra consumers e shutdown gracioso. */
import { Worker as BullMQWorker, Queue } from "bullmq";

import { loadWorkerEnvironment } from "./config/env";
import { createHealthCheckConsumer } from "./consumers/health-check-consumer";
import { createScheduleEvaluatorConsumer } from "./consumers/schedule-evaluator-consumer";

export function bootstrapWorker() {
  const env = loadWorkerEnvironment();
  const connectionOpts = { url: env.redisUrl };

  const healthConsumer = createHealthCheckConsumer();
  const healthConfig = healthConsumer.getConfig();

  const healthWorker = new BullMQWorker(
    healthConfig.queueName,
    async (job) => healthConsumer.processJob(job),
    { connection: connectionOpts, concurrency: healthConfig.concurrency },
  );

  healthWorker.on("failed", (job, error) => {
    healthConsumer.onFailed(job, error);
  });

  healthWorker.on("ready", () => {
    /* startup signal — logged by BullMQ internally */
  });

  const noopInvalidator = {
    invalidateFlowResolver: async (_tenantId: string) => {
      /* noop — replaced with real implementation when DB is connected */
    },
  };
  const noopScheduleStore = {
    findTenantIdsWithActiveSchedules: async () => [] as readonly string[],
  };

  const scheduleConsumer = createScheduleEvaluatorConsumer({
    cacheInvalidator: noopInvalidator,
    scheduleStore: noopScheduleStore,
  });
  const scheduleConfig = scheduleConsumer.getConfig();

  const scheduleWorker = new BullMQWorker(
    scheduleConfig.queueName,
    async (job) => scheduleConsumer.processJob(job),
    { connection: connectionOpts, concurrency: scheduleConfig.concurrency },
  );

  scheduleWorker.on("failed", (job, error) => {
    scheduleConsumer.onFailed(job, error);
  });

  const scheduleQueue = new Queue(scheduleConfig.queueName, { connection: connectionOpts });
  scheduleQueue.upsertJobScheduler(
    "schedule-cron",
    { every: 60_000 },
    {
      name: "evaluate-schedules",
      data: { triggeredAt: Date.now() },
    },
  );

  function gracefulShutdown(_signal: string) {
    Promise.all([healthWorker.close(), scheduleWorker.close(), scheduleQueue.close()])
      .then(() => {
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });
  }

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  return { healthWorker, scheduleWorker, env };
}

bootstrapWorker();
