/** Calendario semanal visual com blocos coloridos por fluxo (RN-027). */
import { useCallback, useMemo } from "react";

import type { ScheduleDto } from "../../services/schedule-api";

type WeeklyGridProps = Readonly<{
  schedules: readonly ScheduleDto[];
  flowNames: Readonly<Record<string, string>>;
  onClickBlock: (schedule: ScheduleDto) => void;
  onClickSlot: (day: number, hour: number) => void;
}>;

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"] as const;
const START_HOUR = 6;
const END_HOUR = 22;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

const FLOW_COLORS = [
  "bg-blue-200 dark:bg-blue-800 border-blue-400",
  "bg-green-200 dark:bg-green-800 border-green-400",
  "bg-purple-200 dark:bg-purple-800 border-purple-400",
  "bg-orange-200 dark:bg-orange-800 border-orange-400",
  "bg-pink-200 dark:bg-pink-800 border-pink-400",
  "bg-teal-200 dark:bg-teal-800 border-teal-400",
];

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) + (m ?? 0) / 60;
}

function getColorForFlow(flowId: string, flowIds: readonly string[]): string {
  const idx = flowIds.indexOf(flowId);
  return FLOW_COLORS[idx % FLOW_COLORS.length] ?? FLOW_COLORS[0] ?? "";
}

export function WeeklyGrid({ schedules, flowNames, onClickBlock, onClickSlot }: WeeklyGridProps) {
  const uniqueFlowIds = useMemo(() => [...new Set(schedules.map((s) => s.flowId))], [schedules]);

  const getSchedulesForDay = useCallback(
    (day: number) => schedules.filter((s) => s.daysOfWeek.includes(day)),
    [schedules],
  );

  const totalHours = END_HOUR - START_HOUR;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="grid min-w-[700px]" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
        <div className="border-b border-r border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900" />
        {DAYS.map((day) => (
          <div
            key={day}
            className="border-b border-r border-gray-200 bg-gray-50 p-2 text-center text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            {day}
          </div>
        ))}

        {HOURS.map((hour) => (
          <div key={`row-${hour}`} className="contents">
            <div className="flex items-start justify-end border-b border-r border-gray-200 bg-gray-50 p-1 pr-2 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              {String(hour).padStart(2, "0")}:00
            </div>
            {DAYS.map((dayLabel, dayIndex) => {
              const daySchedules = getSchedulesForDay(dayIndex);
              const blocksInHour = daySchedules.filter((s) => {
                const startH = parseTime(s.startTime);
                const endH = parseTime(s.endTime);
                return startH <= hour && endH > hour;
              });

              return (
                <div
                  key={`${dayLabel}-${hour}`}
                  className="relative min-h-[40px] border-b border-r border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  onClick={() => onClickSlot(dayIndex, hour)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onClickSlot(dayIndex, hour);
                    }
                  }}
                >
                  {blocksInHour.map((schedule) => {
                    const startH = parseTime(schedule.startTime);
                    const endH = parseTime(schedule.endTime);
                    const isFirstHour = Math.floor(startH) === hour;
                    if (!isFirstHour) {
                      return null;
                    }

                    const _heightPercent = ((endH - startH) / totalHours) * 100;
                    const topOffset = (startH - Math.floor(startH)) * 40;

                    return (
                      <button
                        key={schedule.id}
                        type="button"
                        className={`absolute left-0.5 right-0.5 z-10 rounded border px-1 py-0.5 text-[10px] font-medium leading-tight truncate ${getColorForFlow(schedule.flowId, uniqueFlowIds)}`}
                        style={{
                          top: `${topOffset}px`,
                          height: `${(endH - startH) * 40}px`,
                          minHeight: "20px",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onClickBlock(schedule);
                        }}
                      >
                        {flowNames[schedule.flowId] ?? "Fluxo"}
                        <br />
                        <span className="opacity-70">
                          {schedule.startTime}-{schedule.endTime}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
