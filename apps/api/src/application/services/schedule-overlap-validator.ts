/** Valida sobreposicao de schedules para um mesmo tenant. Impede conflitos de horario/dia (RN-027 R3). */
import type { DayOfWeek, FlowScheduleEntity, FlowScheduleId } from "../../domain/schedule-types";

type OverlapConflict = Readonly<{
  scheduleId: FlowScheduleId;
  day: DayOfWeek;
  existingRange: string;
  newRange: string;
}>;

type OverlapValidationResult =
  | Readonly<{ valid: true }>
  | Readonly<{ valid: false; conflicts: readonly OverlapConflict[] }>;

type ScheduleCandidate = Readonly<{
  id?: FlowScheduleId | undefined;
  daysOfWeek: readonly DayOfWeek[];
  startTime: string;
  endTime: string;
}>;

function hasTimeOverlap(
  existingStart: string,
  existingEnd: string,
  newStart: string,
  newEnd: string,
): boolean {
  return newStart < existingEnd && existingStart < newEnd;
}

export function validateScheduleOverlap(
  existingSchedules: readonly FlowScheduleEntity[],
  candidate: ScheduleCandidate,
): OverlapValidationResult {
  const conflicts: OverlapConflict[] = [];

  for (const existing of existingSchedules) {
    if (candidate.id && existing.id === candidate.id) {
      continue;
    }

    for (const day of candidate.daysOfWeek) {
      if (!existing.daysOfWeek.includes(day)) {
        continue;
      }

      if (
        hasTimeOverlap(existing.startTime, existing.endTime, candidate.startTime, candidate.endTime)
      ) {
        conflicts.push({
          scheduleId: existing.id,
          day,
          existingRange: `${existing.startTime}-${existing.endTime}`,
          newRange: `${candidate.startTime}-${candidate.endTime}`,
        });
      }
    }
  }

  if (conflicts.length === 0) {
    return { valid: true };
  }
  return { valid: false, conflicts };
}

export type { OverlapConflict, OverlapValidationResult, ScheduleCandidate };
