/** WebSocket Elysia para notificações de conversation em tempo real. JWT obrigatório no handshake (RN-025). */
import { Elysia } from "elysia";

import type { AuthTokenPort } from "../../domain/ports/auth-ports";
import type { ConnectionManager } from "./connection-manager";

type CreateConversationWsInput = Readonly<{
  connectionManager: ConnectionManager;
  authTokenPort: AuthTokenPort;
}>;

function extractTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth) {
    const [scheme, token] = auth.split(" ");
    if (scheme === "Bearer" && token) {
      return token;
    }
  }

  const url = new URL(request.url);
  return url.searchParams.get("token");
}

/** Registra rota ws /ws/conversations no Elysia. JWT obrigatório — tenantId extraído do token, não da query. */
export function createConversationWs(input: CreateConversationWsInput) {
  const { connectionManager, authTokenPort } = input;

  return new Elysia().ws("/ws/conversations", {
    async open(ws) {
      const token = extractTokenFromRequest(ws.data.request);

      if (!token) {
        ws.close(4401, "JWT token required");
        return;
      }

      try {
        const claims = await authTokenPort.verify(token);
        const tenantId = claims.tenantId;

        (ws as unknown as Record<string, string>).__tenantId = tenantId;
        connectionManager.addConnection(tenantId, ws);
      } catch {
        ws.close(4401, "Invalid or expired JWT token");
      }
    },

    close(ws) {
      const tenantId = (ws as unknown as Record<string, string>).__tenantId;
      if (tenantId) {
        connectionManager.removeConnection(tenantId, ws);
      }
    },

    message() {
      /* client messages are ignored — this is a push-only channel */
    },
  });
}

export type { CreateConversationWsInput };
