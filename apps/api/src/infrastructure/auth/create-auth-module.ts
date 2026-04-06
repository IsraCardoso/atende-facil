import {
  type AuthTenantMode,
  type CreateUserUseCase,
  createCreateUserUseCase,
  createGetCurrentUserUseCase,
  createLoginUseCase,
  createRegisterTenantUseCase,
  createVerifyAccessTokenUseCase,
  type GetCurrentUserUseCase,
  type LoginUseCase,
  type RegisterTenantUseCase,
  type VerifyAccessTokenUseCase,
} from "../../application/use-cases";
import { createTenantId } from "../../domain";
import type { ApiEnvironment } from "../config/env";
import { createInMemoryAuthRepositories } from "../repositories";
import { createBetterAuthJwtTokenAdapter, createBetterAuthPasswordHasherAdapter } from "./index";

type AuthModule = Readonly<{
  registerTenantUseCase: RegisterTenantUseCase;
  createUserUseCase: CreateUserUseCase;
  loginUseCase: LoginUseCase;
  getCurrentUserUseCase: GetCurrentUserUseCase;
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase;
}>;

function resolveTenantMode(environment: ApiEnvironment): AuthTenantMode {
  if (environment.multiTenant) {
    return {
      multiTenant: true,
    };
  }

  return {
    multiTenant: false,
    defaultTenantId: createTenantId(environment.defaultTenantId ?? ""),
  };
}

export function createAuthModule(environment: ApiEnvironment): AuthModule {
  const repositories = createInMemoryAuthRepositories();
  const passwordHasher = createBetterAuthPasswordHasherAdapter();
  const authTokenPort = createBetterAuthJwtTokenAdapter({
    secret: environment.authSecret,
    tokenTtlSeconds: environment.authTokenTtlSeconds,
  });
  const tenantMode = resolveTenantMode(environment);
  const registerTenantUseCase = createRegisterTenantUseCase({
    tenantRepository: repositories.tenantRepository,
    userRepository: repositories.userRepository,
    membershipRepository: repositories.membershipRepository,
    passwordHasher,
    tenantMode,
  });
  const createUserUseCase = createCreateUserUseCase({
    userRepository: repositories.userRepository,
    membershipRepository: repositories.membershipRepository,
    passwordHasher,
  });
  const loginUseCase = createLoginUseCase({
    userRepository: repositories.userRepository,
    tenantRepository: repositories.tenantRepository,
    membershipRepository: repositories.membershipRepository,
    passwordHasher,
    authTokenPort,
    tenantMode,
  });
  const getCurrentUserUseCase = createGetCurrentUserUseCase({
    userRepository: repositories.userRepository,
    membershipRepository: repositories.membershipRepository,
  });
  const verifyAccessTokenUseCase = createVerifyAccessTokenUseCase({
    authTokenPort,
  });

  return {
    registerTenantUseCase,
    createUserUseCase,
    loginUseCase,
    getCurrentUserUseCase,
    verifyAccessTokenUseCase,
  };
}

export type { AuthModule };
