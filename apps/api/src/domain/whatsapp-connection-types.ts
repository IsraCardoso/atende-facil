/** Estados canônicos de conexão WhatsApp — normalizados a partir de cada provedor. */
type WhatsAppConnectionStatus = "connected" | "disconnected" | "connecting" | "error";

type WhatsAppConnectionState = Readonly<{
  status: WhatsAppConnectionStatus;
  phone?: string;
  reason?: string;
}>;

type WhatsAppPairingResult = Readonly<{
  qrBase64: string;
  expiresAt: number;
}>;

/** DTO público de instância — credenciais mascaradas (RN-029). */
type MaskedWhatsAppInstanceDto = Readonly<{
  id: string;
  tenantId: string;
  provider: string;
  displayName: string | null;
  config: Readonly<Record<string, unknown>>;
  active: boolean;
  isPrimary: boolean;
  webhookUrl: string;
  createdAt: string;
  updatedAt: string;
}>;

export type {
  MaskedWhatsAppInstanceDto,
  WhatsAppConnectionState,
  WhatsAppConnectionStatus,
  WhatsAppPairingResult,
};
