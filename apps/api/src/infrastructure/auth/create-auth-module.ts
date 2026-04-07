/** Módulo DI de autenticação. Registra repositórios, hashers, tokens e use cases no container de injeção de dependência. */
import { createContainer, createToken } from "container";
import type { PostgresJsDatabase, schema } from "db";
import {
  createIdentityCacheService,
  createRbacPolicyService,
  type IdentityCacheService,
  type RbacPolicyService,
} from "../../application/services";
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
import type {
  AppLoggerPort,
  AuthTokenPort,
  CachePort,
  MembershipRepositoryPort,
  PasswordHasherPort,
  TenantRepositoryPort,
  UserRepositoryPort,
} from "../../domain/ports";

import { createInMemoryCacheAdapter, createValkeyCacheAdapterFromUrl } from "../cache";
import type { ApiEnvironment } from "../config/env";
import { createStructuredAppLoggerAdapter, type StructuredLogger } from "../logger";
import {
  createDrizzleMembershipRepository,
  createDrizzleTenantRepository,
  createDrizzleUserRepository,
  createInMemoryAuthRepositories,
  type InMemoryAuthRepositories,
} from "../repositories";
import { createBetterAuthJwtTokenAdapter } from "./better-auth-jwt-token-adapter";
import { createBetterAuthPasswordHasherAdapter } from "./better-auth-password-hasher-adapter";

type AuthModule = Readonly<{
  registerTenantUseCase: RegisterTenantUseCase;
  createUserUseCase: CreateUserUseCase;
  loginUseCase: LoginUseCase;
  getCurrentUserUseCase: GetCurrentUserUseCase;
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase;
  authTokenPort: AuthTokenPort;
}>;

type CreateAuthModuleInput = Readonly<{
  environment: ApiEnvironment;
  logger: StructuredLogger;
  db?: PostgresJsDatabase<typeof schema>;
}>;

type AuthContainerTokenMap = Readonly<{
  repositories: InMemoryAuthRepositories;
  userRepository: UserRepositoryPort;
  tenantRepository: TenantRepositoryPort;
  membershipRepository: MembershipRepositoryPort;
  tenantMode: AuthTenantMode;
  passwordHasher: PasswordHasherPort;
  authTokenPort: AuthTokenPort;
  inMemoryCachePort: CachePort;
  valkeyCachePort: CachePort;
  cachePort: CachePort;
  appLoggerPort: AppLoggerPort;
  identityCacheService: IdentityCacheService;
  rbacPolicyService: RbacPolicyService;
  registerTenantUseCase: RegisterTenantUseCase;
  createUserUseCase: CreateUserUseCase;
  loginUseCase: LoginUseCase;
  getCurrentUserUseCase: GetCurrentUserUseCase;
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase;
}>;

const authContainerTokens: Readonly<{
  [TKey in keyof AuthContainerTokenMap]: ReturnType<
    typeof createToken<AuthContainerTokenMap[TKey]>
  >;
}> = {
  repositories: createToken<InMemoryAuthRepositories>("auth.repositories"),
  userRepository: createToken<UserRepositoryPort>("auth.repositories.user"),
  tenantRepository: createToken<TenantRepositoryPort>("auth.repositories.tenant"),
  membershipRepository: createToken<MembershipRepositoryPort>("auth.repositories.membership"),
  tenantMode: createToken<AuthTenantMode>("auth.tenantMode"),
  passwordHasher: createToken<PasswordHasherPort>("auth.passwordHasher"),
  authTokenPort: createToken<AuthTokenPort>("auth.authTokenPort"),
  inMemoryCachePort: createToken<CachePort>("auth.cache.inMemory"),
  valkeyCachePort: createToken<CachePort>("auth.cache.valkey"),
  cachePort: createToken<CachePort>("auth.cache.active"),
  appLoggerPort: createToken<AppLoggerPort>("auth.logger"),
  identityCacheService: createToken<IdentityCacheService>("auth.identityCacheService"),
  rbacPolicyService: createToken<RbacPolicyService>("auth.rbacPolicyService"),
  registerTenantUseCase: createToken<RegisterTenantUseCase>("auth.useCases.registerTenant"),
  createUserUseCase: createToken<CreateUserUseCase>("auth.useCases.createUser"),
  loginUseCase: createToken<LoginUseCase>("auth.useCases.login"),
  getCurrentUserUseCase: createToken<GetCurrentUserUseCase>("auth.useCases.getCurrentUser"),
  verifyAccessTokenUseCase: createToken<VerifyAccessTokenUseCase>(
    "auth.useCases.verifyAccessToken",
  ),
};

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

function isProductionLikeNodeEnvironment(environment: ApiEnvironment): boolean {
  return environment.nodeEnv === "staging" || environment.nodeEnv === "production";
}

function registerAuthContainer(input: CreateAuthModuleInput): ReturnType<typeof createContainer> {
  const container = createContainer();
  const { environment, logger, db } = input;

  if (db) {
    container.registerSingleton(authContainerTokens.userRepository, () =>
      createDrizzleUserRepository(db),
    );
    container.registerSingleton(authContainerTokens.tenantRepository, () =>
      createDrizzleTenantRepository(db),
    );
    container.registerSingleton(authContainerTokens.membershipRepository, () =>
      createDrizzleMembershipRepository(db),
    );
  } else {
    container.registerSingleton(authContainerTokens.repositories, () =>
      createInMemoryAuthRepositories(),
    );
    container.registerSingleton(
      authContainerTokens.userRepository,
      (resolver) => resolver.resolve(authContainerTokens.repositories).userRepository,
    );
    container.registerSingleton(
      authContainerTokens.tenantRepository,
      (resolver) => resolver.resolve(authContainerTokens.repositories).tenantRepository,
    );
    container.registerSingleton(
      authContainerTokens.membershipRepository,
      (resolver) => resolver.resolve(authContainerTokens.repositories).membershipRepository,
    );
  }
  container.registerSingleton(authContainerTokens.tenantMode, () => resolveTenantMode(environment));
  container.registerSingleton(authContainerTokens.passwordHasher, () =>
    createBetterAuthPasswordHasherAdapter(),
  );
  container.registerSingleton(authContainerTokens.authTokenPort, () =>
    createBetterAuthJwtTokenAdapter({
      secret: environment.authSecret,
      tokenTtlSeconds: environment.authTokenTtlSeconds,
    }),
  );
  container.registerSingleton(authContainerTokens.inMemoryCachePort, () =>
    createInMemoryCacheAdapter(),
  );
  container.registerSingleton(authContainerTokens.valkeyCachePort, () =>
    createValkeyCacheAdapterFromUrl({
      valkeyUrl: environment.redisUrl,
      namespace: "api:auth",
    }),
  );
  container.registerSingleton(authContainerTokens.cachePort, (resolver) => {
    if (isProductionLikeNodeEnvironment(environment)) {
      return resolver.resolve(authContainerTokens.valkeyCachePort);
    }

    return resolver.resolve(authContainerTokens.inMemoryCachePort);
  });
  container.registerSingleton(authContainerTokens.appLoggerPort, () =>
    createStructuredAppLoggerAdapter(logger),
  );
  container.registerSingleton(authContainerTokens.identityCacheService, (resolver) =>
    createIdentityCacheService({
      cachePort: resolver.resolve(authContainerTokens.cachePort),
      logger: resolver.resolve(authContainerTokens.appLoggerPort),
      config: {
        ttlSeconds: 60,
        namespace: "current-user",
      },
    }),
  );
  container.registerSingleton(authContainerTokens.rbacPolicyService, () =>
    createRbacPolicyService(),
  );
  container.registerTransient(authContainerTokens.registerTenantUseCase, (resolver) =>
    createRegisterTenantUseCase({
      tenantRepository: resolver.resolve(authContainerTokens.tenantRepository),
      userRepository: resolver.resolve(authContainerTokens.userRepository),
      membershipRepository: resolver.resolve(authContainerTokens.membershipRepository),
      passwordHasher: resolver.resolve(authContainerTokens.passwordHasher),
      identityCacheService: resolver.resolve(authContainerTokens.identityCacheService),
      tenantMode: resolver.resolve(authContainerTokens.tenantMode),
    }),
  );
  container.registerTransient(authContainerTokens.createUserUseCase, (resolver) =>
    createCreateUserUseCase({
      userRepository: resolver.resolve(authContainerTokens.userRepository),
      membershipRepository: resolver.resolve(authContainerTokens.membershipRepository),
      passwordHasher: resolver.resolve(authContainerTokens.passwordHasher),
      identityCacheService: resolver.resolve(authContainerTokens.identityCacheService),
      rbacPolicyService: resolver.resolve(authContainerTokens.rbacPolicyService),
    }),
  );
  container.registerTransient(authContainerTokens.loginUseCase, (resolver) =>
    createLoginUseCase({
      userRepository: resolver.resolve(authContainerTokens.userRepository),
      tenantRepository: resolver.resolve(authContainerTokens.tenantRepository),
      membershipRepository: resolver.resolve(authContainerTokens.membershipRepository),
      passwordHasher: resolver.resolve(authContainerTokens.passwordHasher),
      authTokenPort: resolver.resolve(authContainerTokens.authTokenPort),
      tenantMode: resolver.resolve(authContainerTokens.tenantMode),
    }),
  );
  container.registerTransient(authContainerTokens.getCurrentUserUseCase, (resolver) =>
    createGetCurrentUserUseCase({
      userRepository: resolver.resolve(authContainerTokens.userRepository),
      membershipRepository: resolver.resolve(authContainerTokens.membershipRepository),
      identityCacheService: resolver.resolve(authContainerTokens.identityCacheService),
      rbacPolicyService: resolver.resolve(authContainerTokens.rbacPolicyService),
    }),
  );
  container.registerTransient(authContainerTokens.verifyAccessTokenUseCase, (resolver) =>
    createVerifyAccessTokenUseCase({
      authTokenPort: resolver.resolve(authContainerTokens.authTokenPort),
    }),
  );

  return container;
}

export function createAuthModule(input: CreateAuthModuleInput): AuthModule {
  const container = registerAuthContainer(input);

  return {
    registerTenantUseCase: container.resolve(authContainerTokens.registerTenantUseCase),
    createUserUseCase: container.resolve(authContainerTokens.createUserUseCase),
    loginUseCase: container.resolve(authContainerTokens.loginUseCase),
    getCurrentUserUseCase: container.resolve(authContainerTokens.getCurrentUserUseCase),
    verifyAccessTokenUseCase: container.resolve(authContainerTokens.verifyAccessTokenUseCase),
    authTokenPort: container.resolve(authContainerTokens.authTokenPort),
  };
}

export type { AuthModule, CreateAuthModuleInput };
