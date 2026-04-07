import { describe, expect, it } from "vitest";

import type { FlowScheduleEntity, FlowScheduleId } from "../../../domain/schedule-types";
import { createInMemoryFlowScheduleRepository } from "../../../infrastructure/repositories/in-memory-flow-schedule-repository";
import { createCreateScheduleUseCase } from "./create-schedule-use-case";
import { createDeleteScheduleUseCase } from "./delete-schedule-use-case";
import { createListSchedulesUseCase } from "./list-schedules-use-case";
import { createUpdateScheduleUseCase } from "./update-schedule-use-case";

const TENANT_ID = "tenant-1";

function createTestScheduleEntity(overrides?: Partial<FlowScheduleEntity>): FlowScheduleEntity {
  return {
    id: "sched-existing" as FlowScheduleId,
    tenantId: TENANT_ID,
    flowId: "flow-1",
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: "08:00",
    endTime: "12:00",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("CreateScheduleUseCase", () => {
  it("should create a schedule successfully", async () => {
    const repo = createInMemoryFlowScheduleRepository();
    const useCase = createCreateScheduleUseCase({ scheduleRepository: repo });

    const result = await useCase.execute({
      tenantId: TENANT_ID,
      role: "admin",
      flowId: "flow-1",
      daysOfWeek: [1, 2, 3],
      startTime: "08:00",
      endTime: "18:00",
    });

    expect(result.schedule.flowId).toBe("flow-1");
    expect(result.schedule.daysOfWeek).toEqual([1, 2, 3]);
  });

  it("should reject overlap with existing schedule", async () => {
    const repo = createInMemoryFlowScheduleRepository();
    await repo.save(createTestScheduleEntity());

    const useCase = createCreateScheduleUseCase({ scheduleRepository: repo });

    await expect(
      useCase.execute({
        tenantId: TENANT_ID,
        role: "admin",
        flowId: "flow-2",
        daysOfWeek: [1],
        startTime: "10:00",
        endTime: "14:00",
      }),
    ).rejects.toThrow("SCHEDULE_OVERLAP");
  });

  it("should reject when role is agent", async () => {
    const repo = createInMemoryFlowScheduleRepository();
    const useCase = createCreateScheduleUseCase({ scheduleRepository: repo });

    await expect(
      useCase.execute({
        tenantId: TENANT_ID,
        role: "agent",
        flowId: "flow-1",
        daysOfWeek: [1],
        startTime: "08:00",
        endTime: "12:00",
      }),
    ).rejects.toThrow("SCHEDULE_FORBIDDEN");
  });

  it("should allow manager role", async () => {
    const repo = createInMemoryFlowScheduleRepository();
    const useCase = createCreateScheduleUseCase({ scheduleRepository: repo });

    const result = await useCase.execute({
      tenantId: TENANT_ID,
      role: "manager",
      flowId: "flow-1",
      daysOfWeek: [6, 0],
      startTime: "09:00",
      endTime: "13:00",
    });

    expect(result.schedule.flowId).toBe("flow-1");
  });
});

describe("UpdateScheduleUseCase", () => {
  it("should update an existing schedule", async () => {
    const repo = createInMemoryFlowScheduleRepository();
    const existing = createTestScheduleEntity();
    await repo.save(existing);

    const useCase = createUpdateScheduleUseCase({ scheduleRepository: repo });
    const result = await useCase.execute({
      tenantId: TENANT_ID,
      role: "admin",
      scheduleId: existing.id,
      endTime: "14:00",
    });

    expect(result.schedule.endTime).toBe("14:00");
  });

  it("should allow overlap with self on update", async () => {
    const repo = createInMemoryFlowScheduleRepository();
    const existing = createTestScheduleEntity();
    await repo.save(existing);

    const useCase = createUpdateScheduleUseCase({ scheduleRepository: repo });
    const result = await useCase.execute({
      tenantId: TENANT_ID,
      role: "admin",
      scheduleId: existing.id,
      startTime: "07:00",
      endTime: "13:00",
    });

    expect(result.schedule.startTime).toBe("07:00");
  });

  it("should reject when role is agent", async () => {
    const repo = createInMemoryFlowScheduleRepository();
    const existing = createTestScheduleEntity();
    await repo.save(existing);

    const useCase = createUpdateScheduleUseCase({ scheduleRepository: repo });
    await expect(
      useCase.execute({
        tenantId: TENANT_ID,
        role: "agent",
        scheduleId: existing.id,
        endTime: "14:00",
      }),
    ).rejects.toThrow("SCHEDULE_FORBIDDEN");
  });

  it("should throw not found for non-existing schedule", async () => {
    const repo = createInMemoryFlowScheduleRepository();
    const useCase = createUpdateScheduleUseCase({ scheduleRepository: repo });

    await expect(
      useCase.execute({
        tenantId: TENANT_ID,
        role: "admin",
        scheduleId: "non-existing",
        endTime: "14:00",
      }),
    ).rejects.toThrow("SCHEDULE_NOT_FOUND");
  });
});

describe("DeleteScheduleUseCase", () => {
  it("should delete an existing schedule", async () => {
    const repo = createInMemoryFlowScheduleRepository();
    const existing = createTestScheduleEntity();
    await repo.save(existing);

    const useCase = createDeleteScheduleUseCase({ scheduleRepository: repo });
    await useCase.execute({
      tenantId: TENANT_ID,
      role: "admin",
      scheduleId: existing.id,
    });

    const found = await repo.findById(TENANT_ID, existing.id);
    expect(found).toBeNull();
  });

  it("should throw not found for non-existing schedule", async () => {
    const repo = createInMemoryFlowScheduleRepository();
    const useCase = createDeleteScheduleUseCase({ scheduleRepository: repo });

    await expect(
      useCase.execute({
        tenantId: TENANT_ID,
        role: "admin",
        scheduleId: "non-existing",
      }),
    ).rejects.toThrow("SCHEDULE_NOT_FOUND");
  });

  it("should reject when role is agent", async () => {
    const repo = createInMemoryFlowScheduleRepository();
    const existing = createTestScheduleEntity();
    await repo.save(existing);

    const useCase = createDeleteScheduleUseCase({ scheduleRepository: repo });
    await expect(
      useCase.execute({
        tenantId: TENANT_ID,
        role: "agent",
        scheduleId: existing.id,
      }),
    ).rejects.toThrow("SCHEDULE_FORBIDDEN");
  });
});

describe("ListSchedulesUseCase", () => {
  it("should return active schedules for a tenant", async () => {
    const repo = createInMemoryFlowScheduleRepository();
    await repo.save(createTestScheduleEntity());
    await repo.save(createTestScheduleEntity({ id: "sched-2" as FlowScheduleId }));

    const useCase = createListSchedulesUseCase({ scheduleRepository: repo });
    const result = await useCase.execute({ tenantId: TENANT_ID });

    expect(result.schedules).toHaveLength(2);
  });

  it("should return empty list when no schedules exist", async () => {
    const repo = createInMemoryFlowScheduleRepository();
    const useCase = createListSchedulesUseCase({ scheduleRepository: repo });
    const result = await useCase.execute({ tenantId: TENANT_ID });

    expect(result.schedules).toHaveLength(0);
  });
});
