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
}>;

/** Cria adapter Chatwoot conectado à API REST. Usa api_access_token para autenticação. */
export function createChatwootHttpAdapter(config: ChatwootHttpConfig): ChatwootPort {
  const baseUrl = `${config.apiUrl}/api/v1/accounts/${config.accountId}`;

  return {
    async createConversation(
      input: ChatwootCreateConversationInput,
    ): Promise<ChatwootConversationId> {
      const response = await fetch(`${baseUrl}/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          api_access_token: config.apiToken,
        },
        body: JSON.stringify({
          source_id: `${input.tenantId}:${input.sessionId}`,
          contact: { phone_number: input.phone },
          custom_attributes: {
            tenant_id: input.tenantId,
            session_id: input.sessionId,
          },
        }),
      });

      const body = (await response.json()) as Record<string, unknown>;
      const conversationId = typeof body.id === "number" ? String(body.id) : String(body.id ?? "");

      if (input.contextMessages.length > 0) {
        const contextText = input.contextMessages.join("\n---\n");
        await fetch(`${baseUrl}/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            api_access_token: config.apiToken,
          },
          body: JSON.stringify({
            content: contextText,
            message_type: "incoming",
            private: true,
          }),
        });
      }

      return createChatwootConversationId(conversationId);
    },

    async sendMessage(input: ChatwootSendMessageInput): Promise<void> {
      await fetch(`${baseUrl}/conversations/${input.conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          api_access_token: config.apiToken,
        },
        body: JSON.stringify({
          content: input.message,
          message_type: "incoming",
        }),
      });
    },

    async findConversationBySessionId(
      sessionId: SessionId,
    ): Promise<ChatwootConversationId | null> {
      const searchUrl = `${baseUrl}/conversations/filter`;
      const response = await fetch(searchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          api_access_token: config.apiToken,
        },
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

      const body = (await response.json()) as Record<string, unknown>;
      const data = isRecord(body.data) ? body.data : null;
      const payload = Array.isArray(data?.payload) ? data.payload : [];
      const first = isRecord(payload[0]) ? payload[0] : null;

      if (first && typeof first.id === "number") {
        return createChatwootConversationId(String(first.id));
      }

      return null;
    },
  };
}

export type { ChatwootHttpConfig };
