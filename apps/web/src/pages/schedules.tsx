/** Página de agendamentos. Integra calendário semanal com modal e API (RN-027). */
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "ui/button";
import { Skeleton } from "ui/skeleton";

import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/page-header";
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

  const openCreateModal = useCallback((day?: number, hour?: number) => {
    setEditingSchedule(undefined);
    setDefaultDay(day);
    setDefaultHour(hour);
    setModalOpen(true);
  }, []);

  const handleClickBlock = useCallback((schedule: ScheduleDto) => {
    setEditingSchedule(schedule);
    setDefaultDay(undefined);
    setDefaultHour(undefined);
    setModalOpen(true);
  }, []);

  const handleClickSlot = useCallback(
    (day: number, hour: number) => {
      openCreateModal(day, hour);
    },
    [openCreateModal],
  );

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

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Agendamentos"
          description="Defina quando cada fluxo publicado deve ficar ativo."
          actions={
            <Button type="button" className="gap-2" onClick={() => openCreateModal(1, 8)}>
              <Plus className="size-4" />
              Novo agendamento
            </Button>
          }
        />

        {loading ? (
          <Skeleton className="h-[480px] w-full rounded-lg" />
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
