/** Modal para criar/editar um schedule de fluxo (RN-027). */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { Button } from "ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "ui/dialog";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { cn } from "ui/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "ui/select";

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

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

function hasOverlap(
  existing: readonly ScheduleDto[],
  candidate: { daysOfWeek: readonly number[]; startTime: string; endTime: string },
  excludeId?: string,
): boolean {
  return existing.some((s) => {
    if (excludeId && s.id === excludeId) {
      return false;
    }
    const hasCommonDay = s.daysOfWeek.some((d) => candidate.daysOfWeek.includes(d));
    if (!hasCommonDay) {
      return false;
    }
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

  const hasPublishedFlows = publishedFlows.length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    if (existingSchedule) {
      setFlowId(existingSchedule.flowId);
      setDaysOfWeek([...existingSchedule.daysOfWeek]);
      setStartTime(existingSchedule.startTime);
      setEndTime(existingSchedule.endTime);
      setActive(existingSchedule.active);
    } else {
      setFlowId(publishedFlows[0]?.id ?? "");
      setDaysOfWeek(defaultDay !== undefined ? [defaultDay] : [1, 2, 3, 4, 5]);
      setStartTime(
        defaultHour !== undefined ? `${String(defaultHour).padStart(2, "0")}:00` : "08:00",
      );
      setEndTime(
        defaultHour !== undefined ? `${String(defaultHour + 1).padStart(2, "0")}:00` : "18:00",
      );
      setActive(true);
    }
  }, [open, existingSchedule, publishedFlows, defaultDay, defaultHour]);

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
    if (!flowId || daysOfWeek.length === 0) {
      return;
    }
    onSave({ flowId, daysOfWeek, startTime, endTime, active });
  }, [flowId, daysOfWeek, startTime, endTime, active, onSave]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existingSchedule ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
        </DialogHeader>

        {!hasPublishedFlows && !existingSchedule ? (
          <Alert>
            <AlertTitle>Nenhum fluxo publicado</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>Publique um fluxo antes de criar um agendamento.</p>
              <Button type="button" variant="outline" size="sm" asChild={true}>
                <Link to="/flows" onClick={onClose}>
                  Ir para Fluxos
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-flow">Fluxo</Label>
              <Select value={flowId} onValueChange={setFlowId}>
                <SelectTrigger id="schedule-flow" className="w-full">
                  <SelectValue placeholder="Selecione o fluxo" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  {publishedFlows.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Dias da semana</span>
              <div className="flex flex-wrap gap-1">
                {DAY_LABELS.map((label, idx) => (
                  <Button
                    key={label}
                    type="button"
                    size="xs"
                    variant={daysOfWeek.includes(idx) ? "default" : "outline"}
                    onClick={() => toggleDay(idx)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="schedule-start">Início</Label>
                <Input
                  id="schedule-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="schedule-end">Fim</Label>
                <Input
                  id="schedule-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="schedule-active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className={cn(
                  "border-input size-4 rounded border",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                )}
              />
              <Label htmlFor="schedule-active">Ativo</Label>
            </div>

            {overlapWarning && (
              <Alert>
                <AlertDescription>
                  Conflito de horário detectado com um agendamento existente.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {(hasPublishedFlows || existingSchedule) && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!flowId || daysOfWeek.length === 0}
            >
              {existingSchedule ? "Atualizar" : "Criar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { ScheduleFormData };
