/** Publisher in-memory para testes. Armazena eventos publicados para asserções. */
import type { DomainEvent } from "../../domain/conversation-types";
import type { DomainEventPublisherPort } from "../../domain/ports/conversation-ports";

type InMemoryEventPublisherExtras = DomainEventPublisherPort &
  Readonly<{
    getPublishedEvents: () => readonly DomainEvent[];
    clear: () => void;
  }>;

export function createInMemoryEventPublisher(): InMemoryEventPublisherExtras {
  const events: DomainEvent[] = [];

  return {
    async publish(event: DomainEvent): Promise<void> {
      events.push(event);
    },

    getPublishedEvents(): readonly DomainEvent[] {
      return [...events];
    },

    clear(): void {
      events.length = 0;
    },
  };
}

export type { InMemoryEventPublisherExtras };
