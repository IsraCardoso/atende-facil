/** Cliente HTTP tipado para comunicação com o backend. Envia Authorization header automaticamente. */
type ApiClientConfig = Readonly<{
  baseUrl: string;
  getToken: () => string | null;
}>;

type ApiResponse<T> = Readonly<{
  ok: boolean;
  status: number;
  data: T;
}>;

async function jsonRequest<T>(
  config: ApiClientConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = config.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = (await response.json()) as T;

  return { ok: response.ok, status: response.status, data };
}

export function createApiClient(config: ApiClientConfig) {
  return {
    get<T>(path: string): Promise<ApiResponse<T>> {
      return jsonRequest<T>(config, "GET", path);
    },

    post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
      return jsonRequest<T>(config, "POST", path, body);
    },

    put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
      return jsonRequest<T>(config, "PUT", path, body);
    },

    patch<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
      return jsonRequest<T>(config, "PATCH", path, body);
    },

    delete<T>(path: string): Promise<ApiResponse<T>> {
      return jsonRequest<T>(config, "DELETE", path);
    },
  };
}

export type { ApiClientConfig, ApiResponse };
