import { describe, expect, it } from "vitest";

import { isOutgoingAgentMessage, parseChatwootWebhookContext } from "./chatwoot-webhook-context";

describe("chatwoot-webhook-context", () => {
  it("should parse conversation id, tenant and phone from Chatwoot payload", () => {
    const context = parseChatwootWebhookContext({
      event: "message_created",
      message_type: "outgoing",
      content: "Oi",
      conversation: {
        id: 1,
        custom_attributes: { tenant_id: "0d618012-142a-478b-b5ad-a57057cde442" },
        meta: {
          sender: { phone_number: "+556285891993" },
        },
      },
    });

    expect(context).toEqual({
      chatwootConversationId: "1",
      tenantId: "0d618012-142a-478b-b5ad-a57057cde442",
      contactPhone: "556285891993",
    });
  });

  it("should treat numeric message_type 1 as outgoing", () => {
    expect(isOutgoingAgentMessage({ message_type: 1 })).toBe(true);
    expect(isOutgoingAgentMessage({ message_type: "outgoing" })).toBe(true);
    expect(isOutgoingAgentMessage({ message_type: "incoming" })).toBe(false);
  });
});
