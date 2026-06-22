/** Rotas de integrações externas — URLs de portal e WhatsApp self-service (RN-019, RN-029). */
import { Elysia } from "elysia";

import type { createChatwootAccessService } from "../../application/services/chatwoot-access-service";
import type { VerifyAccessTokenUseCase } from "../../application/use-cases";
import type { GetIntegrationOperationalSummaryUseCase } from "../../application/use-cases/integration";
import type {
  DeactivateWhatsAppIntegrationUseCase,
  DisconnectWhatsAppUseCase,
  GetWhatsAppConnectionStatusUseCase,
  ListWhatsAppInstancesUseCase,
  StartWhatsAppPairingUseCase,
  UpsertWhatsAppInstanceUseCase,
} from "../../application/use-cases/whatsapp-integration";
import type { TenantRepositoryPort } from "../../domain/ports/auth-ports";
import { authenticateRequest } from "./auth-middleware";
import { createWhatsAppIntegrationRoutes } from "./whatsapp-integration-routes";

const CHATWOOT_NOT_CONFIGURED_REASON =
  "Chatwoot não está configurado. Defina CHATWOOT_APP_URL no ambiente da API.";

type CreateIntegrationRoutesInput = Readonly<{
  chatwootAccess: ReturnType<typeof createChatwootAccessService>;
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase;
  tenantRepository?: TenantRepositoryPort;
  getOperationalSummary?: GetIntegrationOperationalSummaryUseCase;
  whatsapp?: Readonly<{
    listInstances: ListWhatsAppInstancesUseCase;
    upsertInstance: UpsertWhatsAppInstanceUseCase;
    getConnectionStatus: GetWhatsAppConnectionStatusUseCase;
    startPairing: StartWhatsAppPairingUseCase;
    disconnect: DisconnectWhatsAppUseCase;
    deactivate: DeactivateWhatsAppIntegrationUseCase;
  }>;
}>;

function assertAdminRole(role: string, set: { status?: number | string | undefined }): boolean {
  if (role !== "admin" && role !== "manager") {
    set.status = 403;
    return false;
  }
  return true;
}

export function createIntegrationRoutes(input: CreateIntegrationRoutesInput) {
  const {
    chatwootAccess,
    verifyAccessTokenUseCase,
    tenantRepository,
    whatsapp,
    getOperationalSummary,
  } = input;

  const app = new Elysia({ prefix: "/integrations" })
    .derive(async ({ request }) => {
      const authClaims = await authenticateRequest(request, verifyAccessTokenUseCase);
      return { authClaims };
    })
    .get("/chatwoot/portal", () => {
      if (!chatwootAccess.isAppConfigured) {
        return {
          portalUrl: null,
          reason: CHATWOOT_NOT_CONFIGURED_REASON,
        };
      }
      return chatwootAccess.generatePortalUrl();
    });

  if (getOperationalSummary) {
    app.get("/operational-summary", async ({ authClaims, set }) => {
      if (!assertAdminRole(authClaims.role, set)) {
        return { error: "Apenas admin ou manager podem consultar o resumo operacional." };
      }

      return getOperationalSummary.execute({ tenantId: authClaims.tenantId });
    });
  }

  if (whatsapp && tenantRepository) {
    app.use(
      createWhatsAppIntegrationRoutes({
        ...whatsapp,
        tenantRepository,
        verifyAccessTokenUseCase,
      }),
    );
  }

  return app;
}
