/** Subscriber in-memory para testes. Permite dispatch síncrono de eventos para handlers registrados. */
import type { DomainEvent, DomainEventType } from "../../domain/conversation-types";
import type { DomainEventSubscriberPort } from "../../domain/ports/conversation-ports";

type EventHandler = (event: DomainEvent) => void;

type InMemoryEventSubscriberExtras = DomainEventSubscriberPort &
  Readonly<{
    dispatch: (event: DomainEvent) => void;
  }>;

export function createInMemoryEventSubscriber(): InMemoryEventSubscriberExtras {
  const handlers = new Map<DomainEventType, EventHandler[]>();

  return {
    subscribe(eventType: DomainEventType, handler: EventHandler): void {
      const existing = handlers.get(eventType) ?? [];
      existing.push(handler);
      handlers.set(eventType, existing);
    },

    unsubscribeAll(): void {
      handlers.clear();
    },

    dispatch(event: DomainEvent): void {
      const eventHandlers = handlers.get(event.type);
      if (!eventHandlers) {
        return;
      }
      for (const handler of eventHandlers) {
        handler(event);
      }
    },
  };
}

export type { InMemoryEventSubscriberExtras };
