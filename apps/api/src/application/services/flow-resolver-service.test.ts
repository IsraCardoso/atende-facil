import { describe, expect, it, vi } from "vitest";

import type { TenantEntity } from "../../domain/auth-entities";
import type { TenantId, TenantSlug } from "../../domain/auth-types";
import type { FlowEntity, FlowId } from "../../domain/flow-types";
import type { CachePort, TenantRepositoryPort } from "../../domain/ports/auth-ports";
import type { FlowRepositoryPort } from "../../domain/ports/flow-ports";
import type { FlowScheduleEntity, FlowScheduleId } from "../../domain/schedule-types";
import { createInMemoryFlowScheduleRepository } from "../../infrastructure/repositories/in-memory-flow-schedule-repository";
import { createFlowResolverService, toLocalTime } from "./flow-resolver-service";

const TENANT_ID = "tenant-1" as TenantId;
const FLOW_ACTIVE_ID = "flow-active" as FlowId;
const FLOW_SCHEDULED_ID = "flow-scheduled" as FlowId;
const SCHEDULE_ID = "sched-1" as FlowScheduleId;

function createTestTenant(overrides?: Partial<TenantEntity>): TenantEntity {
  return {
    id: TENANT_ID,
    name: "Test Tenant",
    slug: "test-tenant" as TenantSlug,
    timezone: "America/Sao_Paulo",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestFlow(overrides?: Partial<FlowEntity>): FlowEntity {
  return {
    id: FLOW_ACTIVE_ID,
    tenantId: TENANT_ID,
    name: "Active Flow",
    description: null,
    definition: {},
    status: "active",
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function createTestSchedule(overrides?: Partial<FlowScheduleEntity>): FlowScheduleEntity {
  return {
    id: SCHEDULE_ID,
    tenantId: TENANT_ID,
    flowId: FLOW_SCHEDULED_ID,
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: "08:00",
    endTime: "18:00",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockTenantRepo(tenant: TenantEntity | null): TenantRepositoryPort {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(tenant),
    findBySlug: vi.fn(),
    updateTimezone: vi.fn(),
  };
}

function createMockFlowRepo(
  activeFlow: FlowEntity | null,
  scheduledFlow: FlowEntity | null = null,
): FlowRepositoryPort {
  return {
    findById: vi.fn().mockResolvedValue(scheduledFlow),
    findActiveByTenant: vi.fn().mockResolvedValue(activeFlow),
    findByTenantPaginated: vi.fn(),
    save: vi.fn(),
    updateStatus: vi.fn(),
    softDelete: vi.fn(),
  };
}

describe("FlowResolverService", () => {
  it("should return scheduled flow during business hours", async () => {
    const schedule = createTestSchedule();
    const scheduleRepo = createInMemoryFlowScheduleRepository();
    await scheduleRepo.save(schedule);

    const scheduledFlow = createTestFlow({ id: FLOW_SCHEDULED_ID, name: "Scheduled" });
    const activeFlow = createTestFlow();

    const resolver = createFlowResolverService({
      scheduleRepository: scheduleRepo,
      flowRepository: createMockFlowRepo(activeFlow, scheduledFlow),
      tenantRepository: createMockTenantRepo(createTestTenant()),
    });

    const tuesday10am = new Date("2026-04-07T13:00:00Z");
    const result = await resolver.resolveFlow(TENANT_ID, tuesday10am);
    expect(result?.id).toBe(FLOW_SCHEDULED_ID);
  });

  it("should fallback to active flow outside schedule hours", async () => {
    const schedule = createTestSchedule();
    const scheduleRepo = createInMemoryFlowScheduleRepository();
    await scheduleRepo.save(schedule);

    const activeFlow = createTestFlow();

    const resolver = createFlowResolverService({
      scheduleRepository: scheduleRepo,
      flowRepository: createMockFlowRepo(activeFlow, null),
      tenantRepository: createMockTenantRepo(createTestTenant()),
    });

    const tuesday9pm = new Date("2026-04-08T00:00:00Z");
    const result = await resolver.resolveFlow(TENANT_ID, tuesday9pm);
    expect(result?.id).toBe(FLOW_ACTIVE_ID);
  });

  it("should return active flow when no schedules exist", async () => {
    const scheduleRepo = createInMemoryFlowScheduleRepository();
    const activeFlow = createTestFlow();

    const resolver = createFlowResolverService({
      scheduleRepository: scheduleRepo,
      flowRepository: createMockFlowRepo(activeFlow),
      tenantRepository: createMockTenantRepo(createTestTenant()),
    });

    const result = await resolver.resolveFlow(TENANT_ID);
    expect(result?.id).toBe(FLOW_ACTIVE_ID);
  });

  it("should return null when no active flow and no schedule match", async () => {
    const scheduleRepo = createInMemoryFlowScheduleRepository();

    const resolver = createFlowResolverService({
      scheduleRepository: scheduleRepo,
      flowRepository: createMockFlowRepo(null),
      tenantRepository: createMockTenantRepo(createTestTenant()),
    });

    const result = await resolver.resolveFlow(TENANT_ID);
    expect(result).toBeNull();
  });

  it("should return null when tenant is not found", async () => {
    const scheduleRepo = createInMemoryFlowScheduleRepository();

    const resolver = createFlowResolverService({
      scheduleRepository: scheduleRepo,
      flowRepository: createMockFlowRepo(null),
      tenantRepository: createMockTenantRepo(null),
    });

    const result = await resolver.resolveFlow(TENANT_ID);
    expect(result).toBeNull();
  });

  it("should respect tenant timezone for schedule evaluation", async () => {
    const schedule = createTestSchedule({
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: "08:00",
      endTime: "18:00",
    });
    const scheduleRepo = createInMemoryFlowScheduleRepository();
    await scheduleRepo.save(schedule);

    const scheduledFlow = createTestFlow({ id: FLOW_SCHEDULED_ID });
    const activeFlow = createTestFlow();

    const resolver = createFlowResolverService({
      scheduleRepository: scheduleRepo,
      flowRepository: createMockFlowRepo(activeFlow, scheduledFlow),
      tenantRepository: createMockTenantRepo(createTestTenant({ timezone: "America/Manaus" })),
    });

    const utcTime = new Date("2026-04-07T12:00:00Z");
    const result = await resolver.resolveFlow(TENANT_ID, utcTime);
    expect(result?.id).toBe(FLOW_SCHEDULED_ID);
  });

  it("should use cache when available", async () => {
    const scheduleRepo = createInMemoryFlowScheduleRepository();
    const cachedFlow = createTestFlow({ id: FLOW_SCHEDULED_ID });

    const mockCache: CachePort = {
      get: vi.fn().mockResolvedValue(cachedFlow),
      set: vi.fn(),
      delete: vi.fn(),
    };

    const resolver = createFlowResolverService({
      scheduleRepository: scheduleRepo,
      flowRepository: createMockFlowRepo(null),
      tenantRepository: createMockTenantRepo(null),
      cache: mockCache,
    });

    const result = await resolver.resolveFlow(TENANT_ID);
    expect(result?.id).toBe(FLOW_SCHEDULED_ID);
    expect(mockCache.get).toHaveBeenCalledWith(`flow-resolver:${TENANT_ID}`);
  });

  it("should invalidate cache", async () => {
    const mockCache: CachePort = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };

    const resolver = createFlowResolverService({
      scheduleRepository: createInMemoryFlowScheduleRepository(),
      flowRepository: createMockFlowRepo(null),
      tenantRepository: createMockTenantRepo(null),
      cache: mockCache,
    });

    await resolver.invalidateCache(TENANT_ID);
    expect(mockCache.delete).toHaveBeenCalledWith(`flow-resolver:${TENANT_ID}`);
  });

  it("should not match schedule on weekend when only weekdays configured", async () => {
    const schedule = createTestSchedule({ daysOfWeek: [1, 2, 3, 4, 5] });
    const scheduleRepo = createInMemoryFlowScheduleRepository();
    await scheduleRepo.save(schedule);

    const activeFlow = createTestFlow();

    const resolver = createFlowResolverService({
      scheduleRepository: scheduleRepo,
      flowRepository: createMockFlowRepo(activeFlow, null),
      tenantRepository: createMockTenantRepo(createTestTenant()),
    });

    const saturday10am = new Date("2026-04-11T13:00:00Z");
    const result = await resolver.resolveFlow(TENANT_ID, saturday10am);
    expect(result?.id).toBe(FLOW_ACTIVE_ID);
  });
});

describe("toLocalTime", () => {
  it("should convert UTC to Sao Paulo timezone", () => {
    const utc = new Date("2026-04-07T15:30:00Z");
    const result = toLocalTime(utc, "America/Sao_Paulo");
    expect(result.timeStr).toBe("12:30");
    expect(result.dayOfWeek).toBe(2);
  });

  it("should handle midnight crossing timezone", () => {
    const utc = new Date("2026-04-08T02:30:00Z");
    const result = toLocalTime(utc, "America/Sao_Paulo");
    expect(result.timeStr).toBe("23:30");
    expect(result.dayOfWeek).toBe(2);
  });
});
