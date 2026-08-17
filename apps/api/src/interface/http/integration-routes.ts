/** Rotas de integrações externas — URLs de portal e WhatsApp self-service (RN-019, RN-029). */
import { Elysia } from "elysia";

import type { createChatwootAccessService } from "../../application/services/chatwoot-access-service";
import type { VerifyAccessTokenUseCase } from "../../application/use-cases";
import type { GetChatwootSsoUrlUseCase } from "../../application/use-cases/get-chatwoot-sso-url-use-case";
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
import { resolveCorrelationId } from "./correlation-id";
import { createWhatsAppIntegrationRoutes } from "./whatsapp-integration-routes";

const CHATWOOT_NOT_CONFIGURED_REASON =
  "Chatwoot não está configurado. Defina CHATWOOT_APP_URL no ambiente da API.";

type CreateIntegrationRoutesInput = Readonly<{
  chatwootAccess: ReturnType<typeof createChatwootAccessService>;
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase;
  getChatwootSsoUrl?: GetChatwootSsoUrlUseCase;
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
    getChatwootSsoUrl,
  } = input;

  const app = new Elysia({ prefix: "/integrations" })
    .derive(async ({ request }) => {
      const authClaims = await authenticateRequest(request, verifyAccessTokenUseCase);
      return { authClaims, correlationId: resolveCorrelationId(request) };
    })
    .get("/chatwoot/portal", async ({ authClaims, correlationId }) => {
      if (!chatwootAccess.isAppConfigured) {
        return {
          portalUrl: null,
          reason: CHATWOOT_NOT_CONFIGURED_REASON,
        };
      }

      // Sem SSO configurado, cai no portal cru — o atendente ainda precisa logar no Chatwoot.
      if (!getChatwootSsoUrl) {
        return chatwootAccess.generatePortalUrl();
      }

      const sso = await getChatwootSsoUrl.execute({
        userId: authClaims.sub,
        role: authClaims.role,
        correlationId,
        tenantId: authClaims.tenantId,
        redirectPath: chatwootAccess.dashboardPath,
      });

      if (!sso.ssoUrl) {
        return {
          ...chatwootAccess.generatePortalUrl(),
          ...(sso.reason === undefined ? {} : { reason: sso.reason }),
        };
      }

      return { portalUrl: sso.ssoUrl };
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
