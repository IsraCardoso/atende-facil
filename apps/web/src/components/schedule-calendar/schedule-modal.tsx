/** Modal para criar/editar um schedule de fluxo (RN-027). */
import { useCallback, useEffect, useState } from "react";

import type { FlowDto } from "../../services/flow-api";
import type { ScheduleDto } from "../../services/schedule-api";

type ScheduleModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onSave: (data: ScheduleFormData) => void;
  publishedFlows: readonly FlowDto[];
  existingSchedule?: ScheduleDto | undefined;
  defaultDay?: number | undefined;
  defaultHour?: number | undefined;
  existingSchedules: readonly ScheduleDto[];
}>;

type ScheduleFormData = Readonly<{
  flowId: string;
  daysOfWeek: readonly number[];
  startTime: string;
  endTime: string;
  active: boolean;
}>;

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"] as const;

function hasOverlap(
  existing: readonly ScheduleDto[],
  candidate: { daysOfWeek: readonly number[]; startTime: string; endTime: string },
  excludeId?: string,
): boolean {
  return existing.some((s) => {
    if (excludeId && s.id === excludeId) return false;
    const hasCommonDay = s.daysOfWeek.some((d) => candidate.daysOfWeek.includes(d));
    if (!hasCommonDay) return false;
    return s.startTime < candidate.endTime && candidate.startTime < s.endTime;
  });
}

export function ScheduleModal({
  open,
  onClose,
  onSave,
  publishedFlows,
  existingSchedule,
  defaultDay,
  defaultHour,
  existingSchedules,
}: ScheduleModalProps) {
  const [flowId, setFlowId] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [active, setActive] = useState(true);
  const [overlapWarning, setOverlapWarning] = useState(false);

  useEffect(() => {
    if (existingSchedule) {
      setFlowId(existingSchedule.flowId);
      setDaysOfWeek([...existingSchedule.daysOfWeek]);
      setStartTime(existingSchedule.startTime);
      setEndTime(existingSchedule.endTime);
      setActive(existingSchedule.active);
    } else {
      setFlowId(publishedFlows[0]?.id ?? "");
      setDaysOfWeek(defaultDay !== undefined ? [defaultDay] : [1, 2, 3, 4, 5]);
      setStartTime(defaultHour !== undefined ? `${String(defaultHour).padStart(2, "0")}:00` : "08:00");
      setEndTime(defaultHour !== undefined ? `${String(defaultHour + 1).padStart(2, "0")}:00` : "18:00");
      setActive(true);
    }
  }, [existingSchedule, publishedFlows, defaultDay, defaultHour]);

  useEffect(() => {
    const overlap = hasOverlap(
      existingSchedules,
      { daysOfWeek, startTime, endTime },
      existingSchedule?.id,
    );
    setOverlapWarning(overlap);
  }, [daysOfWeek, startTime, endTime, existingSchedules, existingSchedule?.id]);

  const toggleDay = useCallback((day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }, []);

  const handleSubmit = useCallback(() => {
    if (!flowId || daysOfWeek.length === 0) return;
    onSave({ flowId, daysOfWeek, startTime, endTime, active });
  }, [flowId, daysOfWeek, startTime, endTime, active, onSave]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {existingSchedule ? "Editar Agendamento" : "Novo Agendamento"}
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="schedule-flow" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fluxo
            </label>
            <select
              id="schedule-flow"
              value={flowId}
              onChange={(e) => setFlowId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              {publishedFlows.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Dias da semana
            </span>
            <div className="flex gap-1">
              {DAY_LABELS.map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                    daysOfWeek.includes(idx)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="schedule-start" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Inicio
              </label>
              <input
                id="schedule-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="schedule-end" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fim
              </label>
              <input
                id="schedule-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="schedule-active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="schedule-active" className="text-sm text-gray-700 dark:text-gray-300">
              Ativo
            </label>
          </div>

          {overlapWarning && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Conflito de horario detectado com um agendamento existente.
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!flowId || daysOfWeek.length === 0}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {existingSchedule ? "Atualizar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { ScheduleFormData };
