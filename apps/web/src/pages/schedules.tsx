/** Pagina de agendamentos. Integra calendario semanal com modal e API (RN-027). */
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "../components/app-shell";
import {
  type ScheduleFormData,
  ScheduleModal,
} from "../components/schedule-calendar/schedule-modal";
import { WeeklyGrid } from "../components/schedule-calendar/weekly-grid";
import { useAuth } from "../hooks/use-auth";
import { createFlowApi, type FlowDto } from "../services/flow-api";
import { createScheduleApi, type ScheduleDto } from "../services/schedule-api";

export function SchedulesPage() {
  const { token } = useAuth();
  const scheduleApi = useMemo(() => createScheduleApi(() => token), [token]);
  const flowApi = useMemo(() => createFlowApi(() => token), [token]);

  const [schedules, setSchedules] = useState<readonly ScheduleDto[]>([]);
  const [publishedFlows, setPublishedFlows] = useState<readonly FlowDto[]>([]);
  const [flowNames, setFlowNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleDto | undefined>(undefined);
  const [defaultDay, setDefaultDay] = useState<number | undefined>(undefined);
  const [defaultHour, setDefaultHour] = useState<number | undefined>(undefined);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [schedRes, flowRes] = await Promise.all([
      scheduleApi.listSchedules(),
      flowApi.listFlows({ status: "published" }),
    ]);

    if (schedRes.ok) {
      setSchedules(schedRes.data.schedules);
    }

    if (flowRes.ok) {
      setPublishedFlows(flowRes.data.data);
      const names: Record<string, string> = {};
      for (const f of flowRes.data.data) {
        names[f.id] = f.name;
      }
      setFlowNames(names);
    }

    setLoading(false);
  }, [scheduleApi, flowApi]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClickBlock = useCallback((schedule: ScheduleDto) => {
    setEditingSchedule(schedule);
    setDefaultDay(undefined);
    setDefaultHour(undefined);
    setModalOpen(true);
  }, []);

  const handleClickSlot = useCallback((day: number, hour: number) => {
    setEditingSchedule(undefined);
    setDefaultDay(day);
    setDefaultHour(hour);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingSchedule(undefined);
  }, []);

  const handleSave = useCallback(
    async (data: ScheduleFormData) => {
      if (editingSchedule) {
        await scheduleApi.updateSchedule(editingSchedule.id, data);
      } else {
        await scheduleApi.createSchedule({
          flowId: data.flowId,
          daysOfWeek: data.daysOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
        });
      }
      handleCloseModal();
      loadData();
    },
    [editingSchedule, scheduleApi, handleCloseModal, loadData],
  );

  const _handleDelete = useCallback(
    async (schedule: ScheduleDto) => {
      await scheduleApi.deleteSchedule(schedule.id);
      loadData();
    },
    [scheduleApi, loadData],
  );

  return (
    <AppShell>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Agendamentos</h1>
          <button
            type="button"
            onClick={() => handleClickSlot(1, 8)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Novo Agendamento
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <WeeklyGrid
            schedules={schedules}
            flowNames={flowNames}
            onClickBlock={handleClickBlock}
            onClickSlot={handleClickSlot}
          />
        )}

        <ScheduleModal
          open={modalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          publishedFlows={[...publishedFlows]}
          existingSchedule={editingSchedule}
          defaultDay={defaultDay}
          defaultHour={defaultHour}
          existingSchedules={[...schedules]}
        />
      </div>
    </AppShell>
  );
}
