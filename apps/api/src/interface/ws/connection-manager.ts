/** Gerencia conexões WebSocket por tenant. Broadcast isolado por tenantId para notificações em tempo real. */

type WebSocketConnection = Readonly<{
  send: (data: string) => void;
}>;

type ConnectionManager = Readonly<{
  addConnection: (tenantId: string, ws: WebSocketConnection) => void;
  removeConnection: (tenantId: string, ws: WebSocketConnection) => void;
  broadcastToTenant: (tenantId: string, payload: Readonly<Record<string, unknown>>) => void;
  getConnectionCount: (tenantId: string) => number;
}>;

export function createConnectionManager(): ConnectionManager {
  const connections = new Map<string, Set<WebSocketConnection>>();

  return {
    addConnection(tenantId: string, ws: WebSocketConnection): void {
      const existing = connections.get(tenantId) ?? new Set();
      existing.add(ws);
      connections.set(tenantId, existing);
    },

    removeConnection(tenantId: string, ws: WebSocketConnection): void {
      const tenantConnections = connections.get(tenantId);
      if (!tenantConnections) {
        return;
      }

      tenantConnections.delete(ws);
      if (tenantConnections.size === 0) {
        connections.delete(tenantId);
      }
    },

    broadcastToTenant(tenantId: string, payload: Readonly<Record<string, unknown>>): void {
      const tenantConnections = connections.get(tenantId);
      if (!tenantConnections) {
        return;
      }

      const serialized = JSON.stringify(payload);
      for (const ws of tenantConnections) {
        try {
          ws.send(serialized);
        } catch {
          /* error in one broadcast must not block others — RN-015 */
        }
      }
    },

    getConnectionCount(tenantId: string): number {
      return connections.get(tenantId)?.size ?? 0;
    },
  };
}

export type { ConnectionManager, WebSocketConnection };
