/** Adapter HTTP para Chatwoot. Cria conversas, envia mensagens e busca por sessionId via API REST v1. */
import type {
  ChatwootCreateConversationInput,
  ChatwootPort,
  ChatwootSendMessageInput,
} from "../../domain/ports/whatsapp-ports";
import type { ChatwootConversationId, SessionId } from "../../domain/whatsapp-types";
import { createChatwootConversationId } from "../../domain/whatsapp-types";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

type ChatwootHttpConfig = Readonly<{
  apiUrl: string;
  apiToken: string;
  accountId: string;
  inboxId: string;
}>;

function formatPhoneForChatwoot(phone: string): string {
  return phone.startsWith("+") ? phone : `+${phone}`;
}

async function readChatwootError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    return response.statusText;
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    if (isRecord(parsed) && typeof parsed.message === "string") {
      return parsed.message;
    }
    if (isRecord(parsed) && typeof parsed.error === "string") {
      return parsed.error;
    }
  } catch {
    /* body não é JSON */
  }
  return text;
}

async function assertChatwootOk(response: Response, action: string): Promise<void> {
  if (response.ok) {
    return;
  }
  const reason = await readChatwootError(response);
  throw new Error(`Chatwoot ${action} falhou (${response.status}): ${reason}`);
}

function extractContactSourceId(contactPayload: unknown): string | null {
  if (!isRecord(contactPayload)) {
    return null;
  }
  const contact = isRecord(contactPayload.contact) ? contactPayload.contact : contactPayload;
  const inboxes = contact.contact_inboxes;
  if (!Array.isArray(inboxes) || inboxes.length === 0) {
    return null;
  }
  const first = inboxes[0];
  if (!isRecord(first) || typeof first.source_id !== "string") {
    return null;
  }
  return first.source_id;
}

function extractContactId(contactPayload: unknown): number | null {
  if (!isRecord(contactPayload)) {
    return null;
  }
  const contact = isRecord(contactPayload.contact) ? contactPayload.contact : contactPayload;
  if (typeof contact.id === "number") {
    return contact.id;
  }
  return null;
}

/** Cria adapter Chatwoot conectado à API REST. Usa api_access_token para autenticação. */
export function createChatwootHttpAdapter(config: ChatwootHttpConfig): ChatwootPort {
  const baseUrl = `${config.apiUrl.replace(/\/$/, "")}/api/v1/accounts/${config.accountId}`;
  const inboxId = Number(config.inboxId);

  if (!Number.isFinite(inboxId) || inboxId <= 0) {
    throw new Error("CHATWOOT_INBOX_ID inválido: deve ser um número positivo.");
  }

  const authHeaders = {
    "Content-Type": "application/json",
    api_access_token: config.apiToken,
  };

  return {
    async createConversation(
      input: ChatwootCreateConversationInput,
    ): Promise<ChatwootConversationId> {
      const contactResponse = await fetch(`${baseUrl}/contacts`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          inbox_id: inboxId,
          name: input.phone,
          phone_number: formatPhoneForChatwoot(input.phone),
          custom_attributes: {
            tenant_id: input.tenantId,
            session_id: input.sessionId,
          },
        }),
      });

      await assertChatwootOk(contactResponse, "createContact");

      const contactBody = (await contactResponse.json()) as unknown;
      const contactPayload = isRecord(contactBody) && isRecord(contactBody.payload)
        ? contactBody.payload
        : contactBody;

      const sourceId = extractContactSourceId(contactPayload);
      const contactId = extractContactId(contactPayload);

      if (!sourceId || contactId === null) {
        throw new Error("Chatwoot createContact não retornou source_id ou contact_id.");
      }

      const conversationResponse = await fetch(`${baseUrl}/conversations`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          inbox_id: inboxId,
          source_id: sourceId,
          contact_id: contactId,
          custom_attributes: {
            tenant_id: input.tenantId,
            session_id: input.sessionId,
          },
        }),
      });

      await assertChatwootOk(conversationResponse, "createConversation");

      const body = (await conversationResponse.json()) as Record<string, unknown>;
      const rawId = body.id;
      const conversationId =
        typeof rawId === "number" || typeof rawId === "string" ? String(rawId) : "";

      if (!conversationId) {
        throw new Error("Chatwoot createConversation retornou ID vazio.");
      }

      if (input.contextMessages.length > 0) {
        const contextText = input.contextMessages.join("\n---\n");
        const contextResponse = await fetch(`${baseUrl}/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            content: contextText,
            message_type: "incoming",
            private: true,
          }),
        });
        await assertChatwootOk(contextResponse, "createConversation.contextMessages");
      }

      return createChatwootConversationId(conversationId);
    },

    async sendMessage(input: ChatwootSendMessageInput): Promise<void> {
      const response = await fetch(`${baseUrl}/conversations/${input.conversationId}/messages`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          content: input.message,
          message_type: "incoming",
        }),
      });
      await assertChatwootOk(response, "sendMessage");
    },

    async findConversationBySessionId(
      sessionId: SessionId,
    ): Promise<ChatwootConversationId | null> {
      const response = await fetch(`${baseUrl}/conversations/filter`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          payload: [
            {
              attribute_key: "session_id",
              filter_operator: "equal_to",
              values: [sessionId],
              query_operator: null,
            },
          ],
        }),
      });

      await assertChatwootOk(response, "findConversationBySessionId");

      const body = (await response.json()) as Record<string, unknown>;
      const data = isRecord(body.payload) ? body.payload : isRecord(body.data) ? body.data : null;
      const payload = Array.isArray(data?.payload) ? data.payload : [];
      const first = isRecord(payload[0]) ? payload[0] : null;

      if (first && (typeof first.id === "number" || typeof first.id === "string")) {
        return createChatwootConversationId(String(first.id));
      }

      return null;
    },
  };
}

export type { ChatwootHttpConfig };
