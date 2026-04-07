/** Bridge: conecta DomainEventSubscriber ao ConnectionManager para broadcast via WebSocket (RN-015). */
import type { DomainEvent, DomainEventType } from "../../domain/conversation-types";
import type { DomainEventSubscriberPort } from "../../domain/ports/conversation-ports";
import type { ConnectionManager } from "../../interface/ws/connection-manager";

const EVENT_TYPES_TO_BROADCAST: readonly DomainEventType[] = [
  "conversation.handed_off",
  "conversation.human_active",
  "conversation.bot_resumed",
];

function eventToWebSocketPayload(event: DomainEvent): Readonly<Record<string, unknown>> {
  return {
    type: event.type,
    conversationId: event.conversationId,
    phone: event.phone,
    status: extractStatusFromEvent(event),
    timestamp: event.timestamp,
  };
}

function extractStatusFromEvent(event: DomainEvent): string {
  switch (event.type) {
    case "conversation.handed_off":
      return "waiting_human";
    case "conversation.human_active":
      return "human_active";
    case "conversation.bot_resumed":
      return "bot";
    default: {
      const _exhaustive: never = event;
      return "unknown";
    }
  }
}

/** Inicializa a bridge: registra handlers no subscriber para cada tipo de evento que deve ser broadcast via WebSocket. */
export function initializeEventToWebSocketBridge(
  subscriber: DomainEventSubscriberPort,
  connectionManager: ConnectionManager,
): void {
  for (const eventType of EVENT_TYPES_TO_BROADCAST) {
    subscriber.subscribe(eventType, (event: DomainEvent) => {
      const payload = eventToWebSocketPayload(event);
      connectionManager.broadcastToTenant(event.tenantId, payload);
    });
  }
}
