/** Adapter Chatwoot in-memory para testes. Armazena conversas e mensagens em memória. */
import type {
  ChatwootCreateConversationInput,
  ChatwootPort,
  ChatwootSendMessageInput,
} from "../../domain/ports/whatsapp-ports";
import type { ChatwootConversationId, SessionId } from "../../domain/whatsapp-types";
import { createChatwootConversationId } from "../../domain/whatsapp-types";

type StoredConversation = Readonly<{
  conversationId: ChatwootConversationId;
  sessionId: SessionId;
  tenantId: string;
  messages: readonly string[];
}>;

/** Cria adapter Chatwoot in-memory. Expõe getConversations() para assertions em testes. */
export function createInMemoryChatwootAdapter(): ChatwootPort & {
  getConversations: () => readonly StoredConversation[];
} {
  const conversations: StoredConversation[] = [];
  let nextId = 1;

  return {
    async createConversation(
      input: ChatwootCreateConversationInput,
    ): Promise<ChatwootConversationId> {
      const conversationId = createChatwootConversationId(String(nextId));
      nextId += 1;

      conversations.push({
        conversationId,
        sessionId: input.sessionId,
        tenantId: input.tenantId,
        messages: [...input.contextMessages],
      });

      return conversationId;
    },

    async sendMessage(input: ChatwootSendMessageInput): Promise<void> {
      const conversation = conversations.find((c) => c.conversationId === input.conversationId);
      if (conversation) {
        const updated: StoredConversation = {
          ...conversation,
          messages: [...conversation.messages, input.message],
        };
        const idx = conversations.indexOf(conversation);
        conversations[idx] = updated;
      }
    },

    async findConversationBySessionId(
      sessionId: SessionId,
    ): Promise<ChatwootConversationId | null> {
      const found = conversations.find((c) => c.sessionId === sessionId);
      return found?.conversationId ?? null;
    },

    getConversations(): readonly StoredConversation[] {
      return conversations;
    },
  };
}
