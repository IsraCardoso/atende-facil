/** Consumer cron que avalia transicoes de schedule e invalida cache do FlowResolver (RN-027 R5). */
import type { Job } from "bullmq";

import type { BaseConsumer } from "./base-consumer";

type ScheduleEvaluatorPayload = Readonly<{
  triggeredAt: number;
}>;

type CacheInvalidator = Readonly<{
  invalidateFlowResolver: (tenantId: string) => Promise<void>;
}>;

type ScheduleStore = Readonly<{
  findTenantIdsWithActiveSchedules: () => Promise<readonly string[]>;
}>;

type ScheduleEvaluatorDeps = Readonly<{
  cacheInvalidator: CacheInvalidator;
  scheduleStore: ScheduleStore;
}>;

export function createScheduleEvaluatorConsumer(
  deps: ScheduleEvaluatorDeps,
): BaseConsumer<ScheduleEvaluatorPayload, string> {
  return {
    getConfig() {
      return { queueName: "schedule-evaluator", concurrency: 1 };
    },

    async processJob(_job: Job<ScheduleEvaluatorPayload>): Promise<string> {
      const tenantIds = await deps.scheduleStore.findTenantIdsWithActiveSchedules();
      let invalidated = 0;

      const invalidationPromises = tenantIds.map((tenantId) =>
        deps.cacheInvalidator.invalidateFlowResolver(tenantId),
      );
      await Promise.all(invalidationPromises);
      invalidated = tenantIds.length;

      return `evaluated ${tenantIds.length} tenants, invalidated ${invalidated} caches`;
    },

    onFailed(_job, _error) {
      /* logged by worker infrastructure */
    },
  };
}

export type { CacheInvalidator, ScheduleEvaluatorDeps, ScheduleEvaluatorPayload, ScheduleStore };
