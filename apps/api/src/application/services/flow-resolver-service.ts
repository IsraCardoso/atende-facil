/** Resolve qual flow usar para um tenant no momento atual com base em schedules e timezone (RN-027, RN-028). */
import type { TenantRepositoryPort, CachePort } from "../../domain/ports/auth-ports";
import type { FlowRepositoryPort } from "../../domain/ports/flow-ports";
import type { FlowScheduleRepositoryPort } from "../../domain/ports/schedule-ports";
import type { FlowEntity, FlowId } from "../../domain/flow-types";
import type { TenantId } from "../../domain/auth-types";
import type { DayOfWeek } from "../../domain/schedule-types";

const CACHE_TTL_SECONDS = 60;

type FlowResolverDependencies = Readonly<{
  scheduleRepository: FlowScheduleRepositoryPort;
  flowRepository: FlowRepositoryPort;
  tenantRepository: TenantRepositoryPort;
  cache?: CachePort | undefined;
}>;

type FlowResolverService = Readonly<{
  resolveFlow: (tenantId: string, now?: Date | undefined) => Promise<FlowEntity | null>;
  invalidateCache: (tenantId: string) => Promise<void>;
}>;

function buildCacheKey(tenantId: string): string {
  return `flow-resolver:${tenantId}`;
}

/** Converte um Date UTC para hora/dia local de um timezone IANA. */
function toLocalTime(date: Date, timezone: string): { dayOfWeek: DayOfWeek; timeStr: string } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = formatter.formatToParts(date);

  const hourPart = parts.find((p) => p.type === "hour");
  const minutePart = parts.find((p) => p.type === "minute");
  const weekdayPart = parts.find((p) => p.type === "weekday");

  const hour = hourPart?.value ?? "00";
  const minute = minutePart?.value ?? "00";
  const timeStr = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;

  const weekdayMap: Record<string, DayOfWeek> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = weekdayMap[weekdayPart?.value ?? "Sun"] ?? 0;

  return { dayOfWeek, timeStr };
}

export function createFlowResolverService(deps: FlowResolverDependencies): FlowResolverService {
  return {
    async resolveFlow(tenantId: string, now?: Date | undefined): Promise<FlowEntity | null> {
      if (deps.cache) {
        const cached = await deps.cache.get<FlowEntity>(buildCacheKey(tenantId));
        if (cached) return cached;
      }

      const tenant = await deps.tenantRepository.findById(tenantId as TenantId);
      if (!tenant) return null;

      const currentDate = now ?? new Date();
      const { dayOfWeek, timeStr } = toLocalTime(currentDate, tenant.timezone);

      const activeSchedules = await deps.scheduleRepository.findActiveByTenant(tenantId);
      const matchingSchedule = activeSchedules.find(
        (s) =>
          s.daysOfWeek.includes(dayOfWeek) && s.startTime <= timeStr && timeStr < s.endTime,
      );

      let resolvedFlow: FlowEntity | null = null;

      if (matchingSchedule) {
        resolvedFlow = await deps.flowRepository.findById(tenantId, matchingSchedule.flowId as FlowId);
      }

      if (!resolvedFlow) {
        resolvedFlow = await deps.flowRepository.findActiveByTenant(tenantId);
      }

      if (resolvedFlow && deps.cache) {
        await deps.cache.set({
          key: buildCacheKey(tenantId),
          value: resolvedFlow,
          ttlSeconds: CACHE_TTL_SECONDS,
        });
      }

      return resolvedFlow;
    },

    async invalidateCache(tenantId: string): Promise<void> {
      if (deps.cache) {
        await deps.cache.delete(buildCacheKey(tenantId));
      }
    },
  };
}

export { toLocalTime };
export type { FlowResolverDependencies, FlowResolverService };
