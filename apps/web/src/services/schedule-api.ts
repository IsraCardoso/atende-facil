/** Servico de API para schedules e timezone (RN-027, RN-028). */
import { type ApiResponse, createApiClient } from "./api-client";

type ScheduleDto = Readonly<{
  id: string;
  tenantId: string;
  flowId: string;
  daysOfWeek: readonly number[];
  startTime: string;
  endTime: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}>;

type CreateSchedulePayload = Readonly<{
  flowId: string;
  daysOfWeek: readonly number[];
  startTime: string;
  endTime: string;
}>;

type UpdateSchedulePayload = Readonly<{
  flowId?: string;
  daysOfWeek?: readonly number[];
  startTime?: string;
  endTime?: string;
  active?: boolean;
}>;

export function createScheduleApi(getToken: () => string | null) {
  const client = createApiClient({ baseUrl: "/api", getToken });

  return {
    listSchedules(): Promise<ApiResponse<{ schedules: readonly ScheduleDto[] }>> {
      return client.get("/flows/schedules");
    },

    createSchedule(
      payload: CreateSchedulePayload,
    ): Promise<ApiResponse<{ schedule: ScheduleDto }>> {
      return client.post("/flows/schedules", payload);
    },

    updateSchedule(
      id: string,
      payload: UpdateSchedulePayload,
    ): Promise<ApiResponse<{ schedule: ScheduleDto }>> {
      return client.put(`/flows/schedules/${id}`, payload);
    },

    deleteSchedule(id: string): Promise<ApiResponse<{ success: boolean }>> {
      return client.delete(`/flows/schedules/${id}`);
    },

    getTenantTimezone(): Promise<ApiResponse<{ timezone: string }>> {
      return client.get("/tenants/me/timezone");
    },

    updateTenantTimezone(timezone: string): Promise<ApiResponse<{ success: boolean }>> {
      return client.patch("/tenants/me/timezone", { timezone });
    },
  };
}

export type { CreateSchedulePayload, ScheduleDto, UpdateSchedulePayload };
