/** Sincroniza mensagem do agente Chatwoot → WhatsApp do usuário via provider correto (RN-016). */
import type { AppLoggerPort } from "../../domain/ports/auth-ports";
import type { ConversationRepositoryPort } from "../../domain/ports/conversation-ports";
import type {
  WhatsAppInstanceRepositoryPort,
  WhatsAppSenderPort,
} from "../../domain/ports/whatsapp-ports";
import type {
  ChatwootConversationId,
  Phone,
  WhatsAppInstanceConfig,
} from "../../domain/whatsapp-types";
import { createAppError } from "../errors/app-error";
import { resolveConversationFromChatwootWebhook } from "../services/resolve-conversation-from-chatwoot-webhook";

type SyncChatwootMessageDependencies = Readonly<{
  conversationRepository: ConversationRepositoryPort;
  instanceRepository: WhatsAppInstanceRepositoryPort;
  senderResolver: (provider: string) => WhatsAppSenderPort;
  logger: AppLoggerPort;
}>;

type SyncChatwootMessageInput = Readonly<{
  chatwootConversationId: ChatwootConversationId;
  messageContent: string;
  correlationId: string;
  tenantId?: string;
  contactPhone?: Phone;
}>;

type SyncChatwootMessageResult =
  | Readonly<{ success: true }>
  | Readonly<{ success: false; error: ReturnType<typeof createAppError> }>;

export function createSyncChatwootMessageUseCase(deps: SyncChatwootMessageDependencies) {
  return {
    async execute(input: SyncChatwootMessageInput): Promise<SyncChatwootMessageResult> {
      const { chatwootConversationId, messageContent, correlationId, tenantId, contactPhone } =
        input;

      const conversation = await resolveConversationFromChatwootWebhook({
        conversationRepository: deps.conversationRepository,
        chatwootConversationId,
        tenantId,
        contactPhone,
      });
      if (!conversation) {
        deps.logger.warn("Webhook Chatwoot: conversa não encontrada no sistema.", {
          correlationId,
          tenantId: "" as string & { readonly __brand: "TenantId" },
          context: { chatwootConversationId },
        });
        return {
          success: false,
          error: createAppError("CONVERSATION_NOT_FOUND", "Conversa não encontrada."),
        };
      }

      const instances = await deps.instanceRepository.findActiveByTenant(conversation.tenantId);
      const instance = instances[0];
      if (!instance) {
        deps.logger.warn("Nenhuma instância WhatsApp ativa para o tenant.", {
          correlationId,
          tenantId: conversation.tenantId as string & { readonly __brand: "TenantId" },
        });
        return {
          success: false,
          error: createAppError("WHATSAPP_INSTANCE_NOT_FOUND", "Nenhuma instância WhatsApp ativa."),
        };
      }

      const instanceConfig: WhatsAppInstanceConfig = {
        provider: instance.provider,
        config: instance.config,
      } as WhatsAppInstanceConfig;

      const sender = deps.senderResolver(instance.provider);

      await sender.sendText(instanceConfig, {
        to: conversation.phone,
        text: messageContent,
        instanceId: instance.id,
      });

      deps.logger.info("Mensagem do agente enviada ao WhatsApp.", {
        correlationId,
        tenantId: conversation.tenantId as string & { readonly __brand: "TenantId" },
      });

      return { success: true };
    },
  };
}

export type {
  SyncChatwootMessageDependencies,
  SyncChatwootMessageInput,
  SyncChatwootMessageResult,
};
