/** Extrai contexto de lookup a partir do payload bruto de webhooks Chatwoot (RN-016). */
import type { Phone } from "../../domain/whatsapp-types";
import { createPhone } from "../../domain/whatsapp-types";

type ChatwootWebhookContext = Readonly<{
  chatwootConversationId: string;
  tenantId: string | null;
  contactPhone: Phone | null;
}>;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function normalizePhone(raw: string): Phone {
  const digits = raw.replace(/\D/g, "");
  return createPhone(digits);
}

function resolveMeta(
  conversation: Readonly<Record<string, unknown>> | null,
  body: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | null {
  if (conversation && isRecord(conversation.meta)) {
    return conversation.meta;
  }

  if (isRecord(body.meta)) {
    return body.meta;
  }

  return null;
}

function extractSenderPhone(body: Readonly<Record<string, unknown>>): Phone | null {
  const conversation = isRecord(body.conversation) ? body.conversation : null;
  const meta = resolveMeta(conversation, body);
  const sender = isRecord(meta?.sender) ? meta.sender : null;
  const phoneNumber = typeof sender?.phone_number === "string" ? sender.phone_number : null;

  if (!phoneNumber) {
    return null;
  }

  return normalizePhone(phoneNumber);
}

function resolveCustomAttributes(
  conversation: Readonly<Record<string, unknown>> | null,
  body: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | null {
  if (conversation && isRecord(conversation.custom_attributes)) {
    return conversation.custom_attributes;
  }

  if (isRecord(body.custom_attributes)) {
    return body.custom_attributes;
  }

  return null;
}

function extractTenantId(body: Readonly<Record<string, unknown>>): string | null {
  const conversation = isRecord(body.conversation) ? body.conversation : null;
  const customAttributes = resolveCustomAttributes(conversation, body);

  const tenantId = customAttributes?.tenant_id;
  return typeof tenantId === "string" && tenantId.length > 0 ? tenantId : null;
}

function extractConversationId(body: Readonly<Record<string, unknown>>): string | null {
  const conversation = isRecord(body.conversation) ? body.conversation : null;
  if (conversation && typeof conversation.id === "number") {
    return String(conversation.id);
  }

  if (typeof body.id === "number") {
    return String(body.id);
  }

  return null;
}

function isOutgoingAgentMessage(body: Readonly<Record<string, unknown>>): boolean {
  const messageType = body.message_type;
  return messageType === "outgoing" || messageType === 1;
}

function parseChatwootWebhookContext(body: unknown): ChatwootWebhookContext | null {
  if (!isRecord(body)) {
    return null;
  }

  const chatwootConversationId = extractConversationId(body);
  if (!chatwootConversationId) {
    return null;
  }

  return {
    chatwootConversationId,
    tenantId: extractTenantId(body),
    contactPhone: extractSenderPhone(body),
  };
}

export type { ChatwootWebhookContext };
export { isOutgoingAgentMessage, parseChatwootWebhookContext };
