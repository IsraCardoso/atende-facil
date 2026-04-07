/** Rotas HTTP de configuracao de tenant. Timezone update (RN-028). */
import { Elysia, t } from "elysia";

import type { VerifyAccessTokenUseCase } from "../../application/use-cases";
import type { TenantId } from "../../domain/auth-types";
import type { TenantRepositoryPort } from "../../domain/ports/auth-ports";
import { authenticateRequest } from "./auth-middleware";

type CreateTenantRoutesInput = Readonly<{
  tenantRepository: TenantRepositoryPort;
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase;
}>;

export function createTenantRoutes(input: CreateTenantRoutesInput) {
  const { tenantRepository, verifyAccessTokenUseCase } = input;

  return new Elysia({ prefix: "/tenants" })
    .derive(async ({ request }) => {
      const authClaims = await authenticateRequest(request, verifyAccessTokenUseCase);
      return { authClaims };
    })
    .patch(
      "/me/timezone",
      async ({ authClaims, body, set }) => {
        if (authClaims.role !== "admin" && authClaims.role !== "manager") {
          set.status = 403;
          return { error: "Apenas admin ou manager podem alterar timezone." };
        }

        await tenantRepository.updateTimezone(authClaims.tenantId as TenantId, body.timezone);
        return { success: true };
      },
      {
        body: t.Object({
          timezone: t.String({ minLength: 1 }),
        }),
      },
    );
}

export type { CreateTenantRoutesInput };
