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

    async updateSchedule(
      id: string,
      payload: UpdateSchedulePayload,
    ): Promise<ApiResponse<{ schedule: ScheduleDto }>> {
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/flows/schedules/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { schedule: ScheduleDto };
      return { ok: response.ok, status: response.status, data };
    },

    async deleteSchedule(id: string): Promise<ApiResponse<{ success: boolean }>> {
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/flows/schedules/${id}`, { method: "DELETE", headers });
      const data = (await response.json()) as { success: boolean };
      return { ok: response.ok, status: response.status, data };
    },

    async updateTenantTimezone(timezone: string): Promise<ApiResponse<{ success: boolean }>> {
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/tenants/me/timezone", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ timezone }),
      });
      const data = (await response.json()) as { success: boolean };
      return { ok: response.ok, status: response.status, data };
    },
  };
}

export type { CreateSchedulePayload, ScheduleDto, UpdateSchedulePayload };
