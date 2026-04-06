import { Elysia } from "elysia";

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
import { resolveCorrelationId } from "./correlation-id";

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
