import { describe, expect, it } from "vitest";

import type { FlowScheduleEntity, FlowScheduleId } from "../../domain/schedule-types";
import { validateScheduleOverlap } from "./schedule-overlap-validator";

function createSchedule(overrides: Partial<FlowScheduleEntity> = {}): FlowScheduleEntity {
  return {
    id: "sched-1" as FlowScheduleId,
    tenantId: "tenant-1",
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

describe("validateScheduleOverlap", () => {
  it("should detect partial overlap", () => {
    const existing = [createSchedule()];
    const candidate = { daysOfWeek: [1] as const, startTime: "10:00", endTime: "14:00" };

    const result = validateScheduleOverlap(existing, candidate);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]?.day).toBe(1);
    }
  });

  it("should detect total overlap", () => {
    const existing = [createSchedule({ startTime: "08:00", endTime: "17:00" })];
    const candidate = { daysOfWeek: [2] as const, startTime: "09:00", endTime: "11:00" };

    const result = validateScheduleOverlap(existing, candidate);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.conflicts).toHaveLength(1);
    }
  });

  it("should not mark overlap when days are different", () => {
    const existing = [createSchedule({ daysOfWeek: [1, 2, 3] })];
    const candidate = { daysOfWeek: [6, 0] as const, startTime: "08:00", endTime: "12:00" };

    const result = validateScheduleOverlap(existing, candidate);
    expect(result.valid).toBe(true);
  });

  it("should ignore self when excludeId matches", () => {
    const scheduleId = "sched-1" as FlowScheduleId;
    const existing = [createSchedule({ id: scheduleId })];
    const candidate = {
      id: scheduleId,
      daysOfWeek: [1] as const,
      startTime: "08:00",
      endTime: "12:00",
    };

    const result = validateScheduleOverlap(existing, candidate);
    expect(result.valid).toBe(true);
  });

  it("should allow adjacent time ranges without overlap", () => {
    const existing = [createSchedule({ startTime: "08:00", endTime: "12:00" })];
    const candidate = { daysOfWeek: [1] as const, startTime: "12:00", endTime: "18:00" };

    const result = validateScheduleOverlap(existing, candidate);
    expect(result.valid).toBe(true);
  });

  it("should report multiple conflicts across days", () => {
    const existing = [createSchedule({ daysOfWeek: [1, 2, 3] })];
    const candidate = { daysOfWeek: [1, 2, 3] as const, startTime: "10:00", endTime: "14:00" };

    const result = validateScheduleOverlap(existing, candidate);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.conflicts).toHaveLength(3);
    }
  });

  it("should return valid for empty existing schedules", () => {
    const result = validateScheduleOverlap(
      [],
      { daysOfWeek: [1] as const, startTime: "08:00", endTime: "12:00" },
    );
    expect(result.valid).toBe(true);
  });
});
