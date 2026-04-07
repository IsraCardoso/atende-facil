/** Adapter Valkey Pub/Sub para publicação de eventos de domínio. Canal segmentado por tenant (RN-015). */
import { createClient } from "redis";

import type { DomainEvent } from "../../domain/conversation-types";
import type { DomainEventPublisherPort } from "../../domain/ports/conversation-ports";

type ValkeyPublisherClient = Readonly<{
  isOpen: boolean;
  connect: () => Promise<unknown>;
  publish: (channel: string, message: string) => Promise<number>;
  quit: () => Promise<unknown>;
}>;

function buildChannelName(tenantId: string): string {
  return `domain-events:${tenantId}`;
}

function serializeEvent(event: DomainEvent): string {
  return JSON.stringify(event);
}

export function createValkeyEventPublisher(
  client: ValkeyPublisherClient,
): DomainEventPublisherPort {
  let connectionPromise: Promise<void> | null = null;

  async function ensureConnected(): Promise<void> {
    if (client.isOpen) {
      return;
    }
    if (!connectionPromise) {
      connectionPromise = client.connect().then(() => undefined);
    }
    await connectionPromise;
  }

  return {
    async publish(event: DomainEvent): Promise<void> {
      await ensureConnected();
      const channel = buildChannelName(event.tenantId);
      await client.publish(channel, serializeEvent(event));
    },
  };
}

export function createValkeyPublisherClient(valkeyUrl: string): ValkeyPublisherClient {
  return createClient({ url: valkeyUrl });
}

export type { ValkeyPublisherClient };
