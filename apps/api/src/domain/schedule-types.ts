/** Tipos de dominio para agendamento de fluxos. Branded types e entidade de schedule (RN-027). */

type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

type FlowScheduleId = Brand<string, "FlowScheduleId">;

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type FlowScheduleEntity = Readonly<{
  id: FlowScheduleId;
  tenantId: string;
  flowId: string;
  daysOfWeek: readonly DayOfWeek[];
  startTime: string;
  endTime: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>;

const validDaysOfWeek: readonly DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

function isDayOfWeek(value: number): value is DayOfWeek {
  return validDaysOfWeek.includes(value as DayOfWeek);
}

/**
 * Constroi um FlowScheduleId branded.
 * @throws {Error} Quando o valor fica vazio apos trim.
 */
function createFlowScheduleId(rawValue: string): FlowScheduleId {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    throw new Error("FlowScheduleId invalido: valor vazio.");
  }
  return trimmed as FlowScheduleId;
}

function createDaysOfWeek(rawValues: readonly number[]): readonly DayOfWeek[] {
  const validated = rawValues.filter(isDayOfWeek);
  if (validated.length === 0) {
    throw new Error("daysOfWeek invalido: nenhum dia valido (0-6).");
  }
  return validated;
}

export type { DayOfWeek, FlowScheduleEntity, FlowScheduleId };
export { createDaysOfWeek, createFlowScheduleId, isDayOfWeek, validDaysOfWeek };
