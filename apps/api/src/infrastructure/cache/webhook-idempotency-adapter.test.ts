import { describe, expect, it } from "vitest";

import { createWhatsAppMessageId } from "../../domain/whatsapp-types";
import { createInMemoryWebhookIdempotencyAdapter } from "./webhook-idempotency-adapter";

describe("InMemoryWebhookIdempotencyAdapter", () => {
  it("should report new message as not processed", async () => {
    const adapter = createInMemoryWebhookIdempotencyAdapter();
    const messageId = createWhatsAppMessageId("msg-001");

    const result = await adapter.isProcessed("evolution", messageId);

    expect(result).toBe(false);
  });

  it("should report marked message as processed", async () => {
    const adapter = createInMemoryWebhookIdempotencyAdapter();
    const messageId = createWhatsAppMessageId("msg-001");

    await adapter.markProcessed("evolution", messageId, 86400);
    const result = await adapter.isProcessed("evolution", messageId);

    expect(result).toBe(true);
  });

  it("should isolate by provider", async () => {
    const adapter = createInMemoryWebhookIdempotencyAdapter();
    const messageId = createWhatsAppMessageId("msg-001");

    await adapter.markProcessed("evolution", messageId, 86400);

    const evolutionResult = await adapter.isProcessed("evolution", messageId);
    const metaResult = await adapter.isProcessed("meta", messageId);

    expect(evolutionResult).toBe(true);
    expect(metaResult).toBe(false);
  });
});
