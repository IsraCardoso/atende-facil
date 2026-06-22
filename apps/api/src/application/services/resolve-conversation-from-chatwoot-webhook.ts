/** Resolve conversation para webhooks Chatwoot quando ha IDs duplicados (legado mock) ou tenant_id invalido no payload. */
import type { ConversationEntity } from "../../domain/conversation-types";
import type { ConversationRepositoryPort } from "../../domain/ports/conversation-ports";
import type { ChatwootConversationId, Phone } from "../../domain/whatsapp-types";

type ResolveConversationFromChatwootInput = Readonly<{
  conversationRepository: ConversationRepositoryPort;
  chatwootConversationId: ChatwootConversationId;
  tenantId?: string;
  contactPhone?: Phone;
}>;

async function resolveConversationFromChatwootWebhook(
  input: ResolveConversationFromChatwootInput,
): Promise<ConversationEntity | null> {
  const { conversationRepository, chatwootConversationId, tenantId, contactPhone } = input;

  if (contactPhone) {
    const byPhone = await conversationRepository.findByChatwootConversationId(
      chatwootConversationId,
      { phone: contactPhone },
    );
    if (byPhone) {
      return byPhone;
    }
  }

  if (tenantId && contactPhone) {
    const byTenantAndPhone = await conversationRepository.findByChatwootConversationId(
      chatwootConversationId,
      { tenantId, phone: contactPhone },
    );
    if (byTenantAndPhone) {
      return byTenantAndPhone;
    }
  }

  if (tenantId) {
    const byTenant = await conversationRepository.findByChatwootConversationId(
      chatwootConversationId,
      { tenantId },
    );
    if (byTenant) {
      return byTenant;
    }
  }

  return conversationRepository.findByChatwootConversationId(chatwootConversationId);
}

export { resolveConversationFromChatwootWebhook };
