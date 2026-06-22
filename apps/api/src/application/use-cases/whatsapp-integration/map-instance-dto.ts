/** Mapeia entidade de instância para DTO público com webhook URL. */
import type { MaskedWhatsAppInstanceDto } from "../../../domain/whatsapp-connection-types";
import type { WhatsAppInstanceEntity } from "../../../domain/whatsapp-types";
import { maskWhatsAppInstanceConfig } from "../../services/mask-whatsapp-instance-config";

export function mapWhatsAppInstanceToDto(
  instance: WhatsAppInstanceEntity,
  publicApiUrl: string,
): MaskedWhatsAppInstanceDto {
  const webhookUrl = `${publicApiUrl.replace(/\/$/, "")}/webhook/${instance.tenantId}/whatsapp/${instance.id}`;

  return {
    id: instance.id,
    tenantId: instance.tenantId,
    provider: instance.provider,
    displayName: instance.displayName,
    config: maskWhatsAppInstanceConfig(instance.provider, instance.config),
    active: instance.active,
    isPrimary: instance.isPrimary,
    webhookUrl,
    createdAt: instance.createdAt.toISOString(),
    updatedAt: instance.updatedAt.toISOString(),
  };
}
