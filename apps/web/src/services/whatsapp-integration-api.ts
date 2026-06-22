/** Cliente HTTP para integração WhatsApp self-service (RN-029). */
import { type ApiResponse, createApiClient } from "./api-client";

type WhatsAppConnectionStatus = "connected" | "disconnected" | "connecting" | "error";

type WhatsAppInstanceDto = Readonly<{
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

type ConnectionStatusDto = Readonly<{
  status: Readonly<{
    status: WhatsAppConnectionStatus;
    phone?: string;
    reason?: string;
  }>;
}>;

type PairingDto = Readonly<{
  pairing: Readonly<{
    qrBase64: string;
    expiresAt: number;
  }>;
}>;

export function createWhatsAppIntegrationApi(getToken: () => string | null) {
  const client = createApiClient({ baseUrl: "/api", getToken });

  return {
    listInstances(): Promise<ApiResponse<{ instances: readonly WhatsAppInstanceDto[] }>> {
      return client.get("/integrations/whatsapp/instances");
    },

    createInstance(payload: {
      provider: string;
      displayName?: string;
      config?: Readonly<Record<string, unknown>>;
    }): Promise<ApiResponse<{ instance: WhatsAppInstanceDto }>> {
      return client.post("/integrations/whatsapp/instances", payload);
    },

    getStatus(instanceId: string): Promise<ApiResponse<ConnectionStatusDto>> {
      return client.get(`/integrations/whatsapp/instances/${instanceId}/status`);
    },

    startPairing(instanceId: string): Promise<ApiResponse<PairingDto>> {
      return client.post(`/integrations/whatsapp/instances/${instanceId}/pair`, {});
    },

    disconnect(instanceId: string): Promise<ApiResponse<{ success: true }>> {
      return client.post(`/integrations/whatsapp/instances/${instanceId}/disconnect`, {});
    },

    deactivate(instanceId: string): Promise<ApiResponse<{ success: true }>> {
      return client.post(`/integrations/whatsapp/instances/${instanceId}/deactivate`, {});
    },
  };
}

export type { ConnectionStatusDto, WhatsAppConnectionStatus, WhatsAppInstanceDto };
