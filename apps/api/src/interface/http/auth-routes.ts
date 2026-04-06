import { Elysia } from "elysia";

import { requireAllowedRole } from "../../application/services";
import type {
  CreateUserUseCase,
  GetCurrentUserUseCase,
  LoginUseCase,
  RegisterTenantUseCase,
  VerifyAccessTokenUseCase,
} from "../../application/use-cases";
import { authenticateRequest } from "./auth-middleware";
import {
  parseCreateUserInput,
  parseLoginInput,
  parseRegisterTenantInput,
} from "./auth-request-body";

type CreateAuthRoutesInput = Readonly<{
  registerTenantUseCase: RegisterTenantUseCase;
  createUserUseCase: CreateUserUseCase;
  loginUseCase: LoginUseCase;
  getCurrentUserUseCase: GetCurrentUserUseCase;
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase;
}>;

export function createAuthRoutes(input: CreateAuthRoutesInput) {
  const {
    registerTenantUseCase,
    createUserUseCase,
    loginUseCase,
    getCurrentUserUseCase,
    verifyAccessTokenUseCase,
  } = input;
  const protectedRoutes = new Elysia()
    .derive(async ({ request }) => {
      const authClaims = await authenticateRequest(request, verifyAccessTokenUseCase);

      return {
        authClaims,
      };
    })
    .get("/me", async ({ authClaims }) => {
      return getCurrentUserUseCase.execute({
        userId: authClaims.sub,
        tenantId: authClaims.tenantId,
      });
    })
    .post("/users", async ({ authClaims, body, set }) => {
      requireAllowedRole({
        currentRole: authClaims.role,
        allowedRoles: ["admin"],
      });

      const output = await createUserUseCase.execute(
        parseCreateUserInput(body, authClaims.tenantId, authClaims.role),
      );
      set.status = 201;
      return output;
    });

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
