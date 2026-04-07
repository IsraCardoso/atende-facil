/** WebSocket Elysia para notificações de conversation em tempo real. Filtra por tenantId via query param. */
import { Elysia } from "elysia";

import type { ConnectionManager } from "./connection-manager";

type CreateConversationWsInput = Readonly<{
  connectionManager: ConnectionManager;
}>;

/** Registra rota ws /ws/conversations no Elysia. Cada conexão se associa a um tenant via query param. */
export function createConversationWs(input: CreateConversationWsInput) {
  const { connectionManager } = input;

  return new Elysia().ws("/ws/conversations", {
    open(ws) {
      const url = new URL(ws.data.request.url);
      const tenantId = url.searchParams.get("tenantId");

      if (!tenantId) {
        ws.close(4001, "tenantId query param required");
        return;
      }

      (ws as unknown as Record<string, string>).__tenantId = tenantId;
      connectionManager.addConnection(tenantId, ws);
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
