/** Rotas HTTP de autenticação. CRUD de tenants, usuários, login e perfil do usuário autenticado. */
import { Elysia } from "elysia";

import type {
  CreateUserUseCase,
  DeactivateTenantMemberUseCase,
  GetCurrentUserUseCase,
  LoginUseCase,
  RegisterTenantUseCase,
  RemoveTenantMemberUseCase,
  VerifyAccessTokenUseCase,
} from "../../application/use-cases";
import { createUserId } from "../../domain";
import { authenticateRequest } from "./auth-middleware";
import {
  parseCreateUserInput,
  parseLoginInput,
  parseRegisterTenantInput,
} from "./auth-request-body";
import { resolveCorrelationId } from "./correlation-id";

type CreateAuthRoutesInput = Readonly<{
  registerTenantUseCase: RegisterTenantUseCase;
  createUserUseCase: CreateUserUseCase;
  loginUseCase: LoginUseCase;
  getCurrentUserUseCase: GetCurrentUserUseCase;
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase;
  deactivateTenantMemberUseCase: DeactivateTenantMemberUseCase;
  removeTenantMemberUseCase: RemoveTenantMemberUseCase;
}>;

export function createAuthRoutes(input: CreateAuthRoutesInput) {
  const {
    registerTenantUseCase,
    createUserUseCase,
    loginUseCase,
    getCurrentUserUseCase,
    verifyAccessTokenUseCase,
    deactivateTenantMemberUseCase,
    removeTenantMemberUseCase,
  } = input;
  const protectedRoutes = new Elysia()
    .derive(async ({ request }) => {
      const authClaims = await authenticateRequest(request, verifyAccessTokenUseCase);
      const correlationId = resolveCorrelationId(request);

      return {
        authClaims,
        correlationId,
      };
    })
    .get("/me", async ({ authClaims, correlationId }) =>
      getCurrentUserUseCase.execute({
        userId: authClaims.sub,
        tenantId: authClaims.tenantId,
        correlationId,
      }),
    )
    .post("/users", async ({ authClaims, body, correlationId, set }) => {
      const output = await createUserUseCase.execute(
        parseCreateUserInput(body, authClaims.tenantId, authClaims.role, correlationId),
      );
      set.status = 201;
      return output;
    })
    .post("/users/:userId/deactivate", async ({ authClaims, params, correlationId }) =>
      deactivateTenantMemberUseCase.execute({
        actorUserId: authClaims.sub,
        actorRole: authClaims.role,
        tenantId: authClaims.tenantId,
        targetUserId: createUserId(params.userId),
        correlationId,
      }),
    )
    .delete("/users/:userId", async ({ authClaims, params, correlationId }) =>
      removeTenantMemberUseCase.execute({
        actorUserId: authClaims.sub,
        actorRole: authClaims.role,
        tenantId: authClaims.tenantId,
        targetUserId: createUserId(params.userId),
        correlationId,
      }),
    );

  return new Elysia({ prefix: "/auth" })
    .post("/register-tenant", async ({ body, set }) => {
      const output = await registerTenantUseCase.execute(parseRegisterTenantInput(body));
      set.status = 201;
      return output;
    })
    .post("/login", async ({ body }) => {
      const output = await loginUseCase.execute(parseLoginInput(body));

      return {
        accessToken: output.accessToken,
        tokenType: "Bearer" as const,
        claims: output.claims,
        user: output.user,
      };
    })
    .use(protectedRoutes);
}

export type { CreateAuthRoutesInput };
