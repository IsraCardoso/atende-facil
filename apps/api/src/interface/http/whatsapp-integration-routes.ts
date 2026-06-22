/** Rotas HTTP de integração WhatsApp self-service (RN-029). */
import { Elysia, t } from "elysia";
import type { VerifyAccessTokenUseCase } from "../../application/use-cases";
import type {
  DeactivateWhatsAppIntegrationUseCase,
  DisconnectWhatsAppUseCase,
  GetWhatsAppConnectionStatusUseCase,
  ListWhatsAppInstancesUseCase,
  StartWhatsAppPairingUseCase,
  UpsertWhatsAppInstanceUseCase,
} from "../../application/use-cases/whatsapp-integration";
import type { TenantId } from "../../domain/auth-types";
import type { TenantRepositoryPort } from "../../domain/ports/auth-ports";
import { acceptedWhatsAppProviders } from "../../domain/whatsapp-types";
import { authenticateRequest } from "./auth-middleware";

type CreateWhatsAppIntegrationRoutesInput = Readonly<{
  listInstances: ListWhatsAppInstancesUseCase;
  upsertInstance: UpsertWhatsAppInstanceUseCase;
  getConnectionStatus: GetWhatsAppConnectionStatusUseCase;
  startPairing: StartWhatsAppPairingUseCase;
  disconnect: DisconnectWhatsAppUseCase;
  deactivate: DeactivateWhatsAppIntegrationUseCase;
  tenantRepository: TenantRepositoryPort;
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase;
}>;

type RouteSet = { status?: number | string | undefined };

function mapWhatsAppError(error: unknown, set: RouteSet): { error: string; code?: string } | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const code = error.message.split(":")[0] ?? error.message;

  if (error.message === "WHATSAPP_NOT_FOUND") {
    set.status = 404;
    return { error: "Instância WhatsApp não encontrada.", code };
  }
  if (error.message === "WHATSAPP_INVALID_PROVIDER") {
    set.status = 400;
    return { error: "Provedor WhatsApp inválido.", code };
  }
  if (error.message === "WHATSAPP_PLATFORM_UNAVAILABLE") {
    set.status = 503;
    return { error: "Evolution API não configurada na plataforma.", code };
  }
  if (error.message === "WHATSAPP_PAIRING_NOT_SUPPORTED") {
    set.status = 422;
    return { error: "Pareamento QR não suportado para este provedor.", code };
  }
  if (error.message.startsWith("WHATSAPP_CONFIG_INVALID")) {
    set.status = 400;
    return { error: error.message, code: "WHATSAPP_CONFIG_INVALID" };
  }
  if (error.message.startsWith("EVOLUTION_DEPROVISION_FAILED")) {
    set.status = 502;
    return {
      error: "Falha ao remover instância na Evolution API.",
      code: "EVOLUTION_DEPROVISION_FAILED",
    };
  }
  if (error.message.startsWith("EVOLUTION_")) {
    set.status = 502;
    return { error: "Falha ao comunicar com Evolution API.", code };
  }

  return null;
}

function assertAdminRole(role: string, set: RouteSet): boolean {
  if (role !== "admin" && role !== "manager") {
    set.status = 403;
    return false;
  }
  return true;
}

const providerSchema = t.Union(acceptedWhatsAppProviders.map((provider) => t.Literal(provider)));

export function createWhatsAppIntegrationRoutes(input: CreateWhatsAppIntegrationRoutesInput) {
  const {
    listInstances,
    upsertInstance,
    getConnectionStatus,
    startPairing,
    disconnect,
    deactivate,
    tenantRepository,
    verifyAccessTokenUseCase,
  } = input;

  return new Elysia({ prefix: "/whatsapp" })
    .derive(async ({ request }) => {
      const authClaims = await authenticateRequest(request, verifyAccessTokenUseCase);
      return { authClaims };
    })
    .get("/instances", async ({ authClaims }) =>
      listInstances.execute({ tenantId: authClaims.tenantId }),
    )
    .post(
      "/instances",
      async ({ authClaims, body, set }) => {
        if (!assertAdminRole(authClaims.role, set)) {
          return { error: "Apenas admin ou manager podem configurar integração." };
        }

        const tenant = await tenantRepository.findById(authClaims.tenantId as TenantId);
        if (!tenant) {
          set.status = 404;
          return { error: "Tenant não encontrado." };
        }

        try {
          return await upsertInstance.execute({
            tenantId: authClaims.tenantId,
            tenantSlug: tenant.slug,
            provider: body.provider,
            displayName: body.displayName ?? null,
            ...(body.config !== undefined ? { config: body.config } : {}),
          });
        } catch (error) {
          const mapped = mapWhatsAppError(error, set);
          if (mapped) {
            return mapped;
          }
          throw error;
        }
      },
      {
        body: t.Object({
          provider: providerSchema,
          displayName: t.Optional(t.String({ maxLength: 128 })),
          config: t.Optional(t.Record(t.String(), t.Unknown())),
        }),
      },
    )
    .put(
      "/instances/:id",
      async ({ authClaims, params, body, set }) => {
        if (!assertAdminRole(authClaims.role, set)) {
          return { error: "Apenas admin ou manager podem configurar integração." };
        }

        const tenant = await tenantRepository.findById(authClaims.tenantId as TenantId);
        if (!tenant) {
          set.status = 404;
          return { error: "Tenant não encontrado." };
        }

        try {
          return await upsertInstance.execute({
            tenantId: authClaims.tenantId,
            tenantSlug: tenant.slug,
            instanceId: params.id,
            provider: body.provider,
            displayName: body.displayName ?? null,
            ...(body.config !== undefined ? { config: body.config } : {}),
          });
        } catch (error) {
          const mapped = mapWhatsAppError(error, set);
          if (mapped) {
            return mapped;
          }
          throw error;
        }
      },
      {
        body: t.Object({
          provider: providerSchema,
          displayName: t.Optional(t.String({ maxLength: 128 })),
          config: t.Optional(t.Record(t.String(), t.Unknown())),
        }),
      },
    )
    .get("/instances/:id/status", async ({ authClaims, params, set }) => {
      try {
        return await getConnectionStatus.execute({
          tenantId: authClaims.tenantId,
          instanceId: params.id,
        });
      } catch (error) {
        const mapped = mapWhatsAppError(error, set);
        if (mapped) {
          return mapped;
        }
        throw error;
      }
    })
    .post("/instances/:id/pair", async ({ authClaims, params, set }) => {
      if (!assertAdminRole(authClaims.role, set)) {
        return { error: "Apenas admin ou manager podem conectar WhatsApp." };
      }

      try {
        return await startPairing.execute({
          tenantId: authClaims.tenantId,
          instanceId: params.id,
        });
      } catch (error) {
        const mapped = mapWhatsAppError(error, set);
        if (mapped) {
          return mapped;
        }
        throw error;
      }
    })
    .post("/instances/:id/disconnect", async ({ authClaims, params, set }) => {
      if (!assertAdminRole(authClaims.role, set)) {
        return { error: "Apenas admin ou manager podem desconectar WhatsApp." };
      }

      try {
        return await disconnect.execute({
          tenantId: authClaims.tenantId,
          instanceId: params.id,
        });
      } catch (error) {
        const mapped = mapWhatsAppError(error, set);
        if (mapped) {
          return mapped;
        }
        throw error;
      }
    })
    .post("/instances/:id/deactivate", async ({ authClaims, params, set }) => {
      if (!assertAdminRole(authClaims.role, set)) {
        return { error: "Apenas admin ou manager podem desativar a integração." };
      }

      try {
        return await deactivate.execute({
          tenantId: authClaims.tenantId,
          instanceId: params.id,
        });
      } catch (error) {
        const mapped = mapWhatsAppError(error, set);
        if (mapped) {
          return mapped;
        }
        throw error;
      }
    });
}
