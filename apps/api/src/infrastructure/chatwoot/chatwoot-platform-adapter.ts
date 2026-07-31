/**
 * Adapter da Platform API do Chatwoot. Espelha usuários e emite URLs de SSO
 * para login único: o Atende Fácil autentica, o Chatwoot confia no token emitido aqui.
 *
 * Requer um Platform App token — distinto do api_access_token de conta usado pelo
 * chatwoot-http-adapter. Gerado no console Rails: `PlatformApp.create(name: 'x').access_token.token`.
 */
import type { ChatwootPlatformPort } from "../../domain/ports/chatwoot-platform-ports";

const REQUEST_TIMEOUT_MS = 8_000;

type ChatwootPlatformConfig = Readonly<{
  apiUrl: string;
  platformToken: string;
  accountId: string;
}>;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

async function readErrorBody(response: Response): Promise<string> {
  const text = await response.text();

  if (!text) {
    return response.statusText;
  }

  try {
    const parsed = JSON.parse(text) as unknown;

    if (isRecord(parsed) && typeof parsed.message === "string") {
      return parsed.message;
    }

    if (isRecord(parsed) && typeof parsed.error === "string") {
      return parsed.error;
    }
  } catch {
    /* body não é JSON */
  }

  return text;
}

/** Envia a requisição com timeout. Sem isso, um Chatwoot lento travaria o request do atendente. */
async function requestPlatform(
  config: ChatwootPlatformConfig,
  path: string,
  init: Readonly<{ method: "GET" | "POST"; body?: unknown }>,
): Promise<unknown> {
  const url = `${config.apiUrl.replace(/\/$/, "")}/platform/api/v1${path}`;

  const response = await fetch(url, {
    method: init.method,
    headers: {
      "Content-Type": "application/json",
      api_access_token: config.platformToken,
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const reason = await readErrorBody(response);
    throw new Error(
      `Chatwoot Platform ${init.method} ${path} falhou (${response.status}): ${reason}`,
    );
  }

  return (await response.json()) as unknown;
}

function extractId(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const rawId = payload.id;
  return typeof rawId === "number" || typeof rawId === "string" ? String(rawId) : null;
}

/**
 * Cria adapter da Platform API.
 * @throws {Error} Se apiUrl ou platformToken estiverem vazios.
 */
export function createChatwootPlatformAdapter(
  config: ChatwootPlatformConfig,
): ChatwootPlatformPort {
  if (!config.apiUrl.trim()) {
    throw new Error("CHATWOOT_API_URL obrigatório para a Platform API.");
  }

  if (!config.platformToken.trim()) {
    throw new Error("CHATWOOT_PLATFORM_TOKEN obrigatório para a Platform API.");
  }

  return {
    async createUser(input): Promise<string> {
      const payload = await requestPlatform(config, "/users", {
        method: "POST",
        body: {
          name: input.displayName,
          display_name: input.displayName,
          email: input.email,
          password: input.password,
        },
      });

      const chatwootUserId = extractId(payload);

      if (!chatwootUserId) {
        throw new Error("Chatwoot Platform createUser não retornou id.");
      }

      return chatwootUserId;
    },

    async addUserToAccount(input): Promise<void> {
      await requestPlatform(config, `/accounts/${config.accountId}/account_users`, {
        method: "POST",
        body: {
          user_id: Number(input.chatwootUserId),
          role: input.role,
        },
      });
    },

    async createSsoUrl(chatwootUserId: string): Promise<string> {
      const payload = await requestPlatform(config, `/users/${chatwootUserId}/login`, {
        method: "GET",
      });

      if (!isRecord(payload) || typeof payload.url !== "string" || !payload.url) {
        throw new Error("Chatwoot Platform login não retornou url de SSO.");
      }

      return payload.url;
    },
  };
}

export type { ChatwootPlatformConfig };
