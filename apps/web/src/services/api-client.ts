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

async function request<T>(
  config: ApiClientConfig,
  method: string,
  path: string,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = config.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${config.baseUrl}${path}`, { method, headers });
  const data = (await response.json()) as T;

  return { ok: response.ok, status: response.status, data };
}

export function createApiClient(config: ApiClientConfig) {
  return {
    get<T>(path: string): Promise<ApiResponse<T>> {
      return request<T>(config, "GET", path);
    },

    async post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const token = config.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${config.baseUrl}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as T;
      return { ok: response.ok, status: response.status, data };
    },
  };
}

export type { ApiClientConfig, ApiResponse };
