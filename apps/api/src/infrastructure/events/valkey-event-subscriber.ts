/** Adapter Valkey Pub/Sub para consumo de eventos de domínio. Usa PSUBSCRIBE para todos os tenants (RN-015). */
import { createClient } from "redis";

import type { DomainEvent, DomainEventType } from "../../domain/conversation-types";
import type { DomainEventSubscriberPort } from "../../domain/ports/conversation-ports";

type EventHandler = (event: DomainEvent) => void;

type ValkeySubscriberClient = Readonly<{
  isOpen: boolean;
  connect: () => Promise<unknown>;
  pSubscribe: (
    pattern: string,
    listener: (message: string, channel: string) => void,
  ) => Promise<void>;
  pUnsubscribe: (pattern: string) => Promise<void>;
  quit: () => Promise<unknown>;
}>;

const CHANNEL_PATTERN = "domain-events:*";

function deserializeEvent(rawMessage: string): DomainEvent | null {
  try {
    return JSON.parse(rawMessage) as DomainEvent;
  } catch {
    return null;
  }
}

export function createValkeyEventSubscriber(
  client: ValkeySubscriberClient,
): DomainEventSubscriberPort {
  const handlers = new Map<DomainEventType, EventHandler[]>();
  let subscribed = false;
  let connectionPromise: Promise<void> | null = null;

  async function ensureSubscribed(): Promise<void> {
    if (subscribed) {
      return;
    }

    if (!client.isOpen) {
      if (!connectionPromise) {
        connectionPromise = client.connect().then(() => undefined);
      }
      await connectionPromise;
    }

    await client.pSubscribe(CHANNEL_PATTERN, (message: string) => {
      const event = deserializeEvent(message);
      if (!event) {
        return;
      }

      const eventHandlers = handlers.get(event.type);
      if (!eventHandlers) {
        return;
      }

      for (const handler of eventHandlers) {
        try {
          handler(event);
        } catch {
          /* handler errors are isolated — RN-015 */
        }
      }
    });

    subscribed = true;
  }

  return {
    subscribe(eventType: DomainEventType, handler: EventHandler): void {
      const existing = handlers.get(eventType) ?? [];
      existing.push(handler);
      handlers.set(eventType, existing);

      ensureSubscribed().catch(() => {
        /* subscribe errors are non-fatal */
      });
    },

    unsubscribeAll(): void {
      handlers.clear();
      if (subscribed) {
        client.pUnsubscribe(CHANNEL_PATTERN).catch(() => {
          /* unsubscribe errors are non-fatal */
        });
        subscribed = false;
      }
    },
  };
}

export function createValkeySubscriberClient(valkeyUrl: string): ValkeySubscriberClient {
  return createClient({ url: valkeyUrl });
}

export type { ValkeySubscriberClient };
