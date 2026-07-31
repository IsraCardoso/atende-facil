/** Servico de API para flows. Tipado com contratos do backend (RN-022). */
import { type ApiResponse, createApiClient } from "./api-client";

type FlowDto = Readonly<{
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  definition: Record<string, unknown>;
  status: "draft" | "published" | "active" | "archived";
  version: number;
  createdAt: string;
  updatedAt: string;
}>;

type PaginatedFlows = Readonly<{
  data: readonly FlowDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}>;

type ValidationIssue = Readonly<{
  code: string;
  severity: "error" | "warning";
  message: string;
  nodeId?: string;
}>;

type ValidationResult = Readonly<{
  validation: Readonly<{
    isValid: boolean;
    issues: readonly ValidationIssue[];
  }>;
}>;

export function createFlowApi(getToken: () => string | null) {
  const client = createApiClient({ baseUrl: "/api", getToken });

  return {
    listFlows(params?: { status?: string; page?: number; limit?: number }) {
      const query = new URLSearchParams();
      if (params?.status) {
        query.set("status", params.status);
      }
      if (params?.page) {
        query.set("page", String(params.page));
      }
      if (params?.limit) {
        query.set("limit", String(params.limit));
      }
      const qs = query.toString();
      return client.get<PaginatedFlows>(`/flows${qs ? `?${qs}` : ""}`);
    },

    getFlow(id: string) {
      return client.get<FlowDto>(`/flows/${id}`);
    },

    createFlow(name: string, description?: string) {
      return client.post<{ flow: FlowDto }>("/flows", { name, description });
    },

    updateFlow(
      id: string,
      payload: { name?: string; description?: string; definition?: Record<string, unknown> },
    ) {
      return putRequest<{ flow: FlowDto }>(getToken, `/flows/${id}`, payload);
    },

    deleteFlow(id: string) {
      return deleteRequest(getToken, `/flows/${id}`);
    },

    publishFlow(id: string) {
      return client.post<{ flow: FlowDto }>(`/flows/${id}/publish`, {});
    },

    activateFlow(id: string) {
      return client.post<{ flow: FlowDto }>(`/flows/${id}/activate`, {});
    },

    goLiveFlow(id: string) {
      return client.post<{ flow: FlowDto; previousActiveFlow: FlowDto | null }>(
        `/flows/${id}/go-live`,
        {},
      );
    },

    deactivateFlow(id: string) {
      return client.post<{ flow: FlowDto }>(`/flows/${id}/deactivate`, {});
    },

    archiveFlow(id: string) {
      return client.post<{ success: boolean }>(`/flows/${id}/archive`, {});
    },

    validateFlow(id: string) {
      return client.post<ValidationResult>(`/flows/${id}/validate`, {});
    },
  };
}

async function putRequest<T>(
  getToken: () => string | null,
  path: string,
  body: unknown,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`/api${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T;
  return { ok: response.ok, status: response.status, data };
}

async function deleteRequest(
  getToken: () => string | null,
  path: string,
): Promise<ApiResponse<{ success: boolean }>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`/api${path}`, { method: "DELETE", headers });
  const data = (await response.json()) as { success: boolean };
  return { ok: response.ok, status: response.status, data };
}

export type { FlowDto, PaginatedFlows, ValidationIssue, ValidationResult };
