/** Cliente HTTP para resumo operacional de integrações (settings dashboard). */
import { type ApiResponse, createApiClient } from "./api-client";

type WhatsAppOperationalSummary = Readonly<{
  configured: boolean;
  instanceId?: string;
  displayName?: string | null;
  connectionStatus?: "connected" | "disconnected" | "connecting" | "error";
  phone?: string;
  reason?: string;
}>;

type ActiveFlowSummary = Readonly<{
  id: string;
  name: string;
}>;

type PlatformOperationalSummary = Readonly<{
  available: boolean;
  reason?: string;
}>;

type IntegrationOperationalSummary = Readonly<{
  whatsapp: WhatsAppOperationalSummary;
  activeFlow: ActiveFlowSummary | null;
  platform: PlatformOperationalSummary;
}>;

export function createIntegrationOperationalApi(getToken: () => string | null) {
  const client = createApiClient({ baseUrl: "/api", getToken });

  return {
    getOperationalSummary(): Promise<ApiResponse<IntegrationOperationalSummary>> {
      return client.get("/integrations/operational-summary");
    },
  };
}

export type {
  ActiveFlowSummary,
  IntegrationOperationalSummary,
  PlatformOperationalSummary,
  WhatsAppOperationalSummary,
};
