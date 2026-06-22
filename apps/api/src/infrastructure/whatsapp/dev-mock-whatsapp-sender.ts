/** Sender de desenvolvimento: simula envio WhatsApp sem chamar Evolution (DEV_MOCK_WHATSAPP_SEND=true). */
import type { WhatsAppSenderPort } from "../../domain/ports/whatsapp-ports";
import type {
  CanonicalDeliveryStatus,
  CanonicalOutboundMessage,
  WhatsAppInstanceConfig,
} from "../../domain/whatsapp-types";
import { createWhatsAppMessageId } from "../../domain/whatsapp-types";

export function createDevMockWhatsAppSender(): WhatsAppSenderPort {
  return {
    async sendText(
      _config: WhatsAppInstanceConfig,
      _message: CanonicalOutboundMessage,
    ): Promise<CanonicalDeliveryStatus> {
      return {
        messageId: createWhatsAppMessageId(`dev-mock-${Date.now()}`),
        status: "sent",
        timestamp: Date.now(),
      };
    },
  };
}
