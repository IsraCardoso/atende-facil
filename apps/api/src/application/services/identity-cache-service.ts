/** Serviço de cache de identidade. Evita queries repetidas ao banco para dados do usuário autenticado. */
import type { SafeUserProfile, TenantId, TenantMembershipEntity, UserId } from "../../domain";
import type { AppLoggerPort, CachePort, CurrentUserProjection } from "../../domain/ports";

type IdentityCacheServiceConfig = Readonly<{
  ttlSeconds: number;
  namespace: string;
}>;

type IdentityCacheServiceInput = Readonly<{
  tenantId: TenantId;
  userId: UserId;
  correlationId: string;
}>;

type IdentityCacheService = Readonly<{
  getOrLoad: (
    input: IdentityCacheServiceInput,
    loader: () => Promise<CurrentUserProjection>,
  ) => Promise<CurrentUserProjection>;
  invalidate: (input: IdentityCacheServiceInput) => Promise<void>;
}>;

type CachedSafeUserProfile = Omit<SafeUserProfile, "createdAt" | "updatedAt"> &
  Readonly<{
    createdAt: string;
    updatedAt: string;
  }>;

type CachedMembership = Omit<TenantMembershipEntity, "createdAt" | "updatedAt"> &
  Readonly<{
    createdAt: string;
    updatedAt: string;
  }>;

type IdentityCachePayload = Readonly<{
  user: CachedSafeUserProfile;
  memberships: readonly CachedMembership[];
}>;

type CreateIdentityCacheServiceDependencies = Readonly<{
  cachePort: CachePort;
  logger: AppLoggerPort;
  config?: Partial<IdentityCacheServiceConfig>;
}>;

const defaultCacheConfig: IdentityCacheServiceConfig = {
  ttlSeconds: 60,
  namespace: "auth:identity",
};

function createCacheKey(input: IdentityCacheServiceInput, namespace: string): string {
  return `${namespace}:${input.tenantId}:${input.userId}`;
}

function serializeCurrentUserProjection(projection: CurrentUserProjection): IdentityCachePayload {
  return {
    user: {
      ...projection.user,
      createdAt: projection.user.createdAt.toISOString(),
      updatedAt: projection.user.updatedAt.toISOString(),
    },
    memberships: projection.memberships.map((membership) => ({
      ...membership,
      createdAt: membership.createdAt.toISOString(),
      updatedAt: membership.updatedAt.toISOString(),
    })),
  };
}

function deserializeCurrentUserProjection(payload: IdentityCachePayload): CurrentUserProjection {
  return {
    user: {
      ...payload.user,
      createdAt: new Date(payload.user.createdAt),
      updatedAt: new Date(payload.user.updatedAt),
    },
    memberships: payload.memberships.map((membership) => ({
      ...membership,
      createdAt: new Date(membership.createdAt),
      updatedAt: new Date(membership.updatedAt),
    })),
  };
}

function getReadableErrorReason(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "erro desconhecido";
}

export function createIdentityCacheService(
  dependencies: CreateIdentityCacheServiceDependencies,
): IdentityCacheService {
  const { cachePort, logger, config } = dependencies;
  const resolvedConfig: IdentityCacheServiceConfig = {
    ttlSeconds: config?.ttlSeconds ?? defaultCacheConfig.ttlSeconds,
    namespace: config?.namespace ?? defaultCacheConfig.namespace,
  };

  return {
    async getOrLoad(
      input: IdentityCacheServiceInput,
      loader: () => Promise<CurrentUserProjection>,
    ): Promise<CurrentUserProjection> {
      const cacheKey = createCacheKey(input, resolvedConfig.namespace);

      try {
        const cachedPayload = await cachePort.get<IdentityCachePayload>(cacheKey);

        if (cachedPayload) {
          logger.debug("Cache HIT de identidade.", {
            correlationId: input.correlationId,
            tenantId: input.tenantId,
            context: {
              cacheKey,
              userId: input.userId,
            },
          });
          return deserializeCurrentUserProjection(cachedPayload);
        }
      } catch (error: unknown) {
        logger.warn("Falha ao consultar cache de identidade. Seguindo fallback para repositório.", {
          correlationId: input.correlationId,
          tenantId: input.tenantId,
          context: {
            cacheKey,
            reason: getReadableErrorReason(error),
          },
        });
      }

      const projection = await loader();

      try {
        await cachePort.set({
          key: cacheKey,
          ttlSeconds: resolvedConfig.ttlSeconds,
          value: serializeCurrentUserProjection(projection),
        });

        logger.debug("Cache MISS de identidade. Valor persistido no cache.", {
          correlationId: input.correlationId,
          tenantId: input.tenantId,
          context: {
            cacheKey,
            userId: input.userId,
            ttlSeconds: resolvedConfig.ttlSeconds,
          },
        });
      } catch (error: unknown) {
        logger.warn("Falha ao persistir cache de identidade.", {
          correlationId: input.correlationId,
          tenantId: input.tenantId,
          context: {
            cacheKey,
            reason: getReadableErrorReason(error),
          },
        });
      }

      return projection;
    },
    async invalidate(input: IdentityCacheServiceInput): Promise<void> {
      const cacheKey = createCacheKey(input, resolvedConfig.namespace);

      try {
        await cachePort.delete(cacheKey);

        logger.debug("Cache de identidade invalidado.", {
          correlationId: input.correlationId,
          tenantId: input.tenantId,
          context: {
            cacheKey,
            userId: input.userId,
          },
        });
      } catch (error: unknown) {
        logger.warn("Falha ao invalidar cache de identidade.", {
          correlationId: input.correlationId,
          tenantId: input.tenantId,
          context: {
            cacheKey,
            reason: getReadableErrorReason(error),
          },
        });
      }
    },
  };
}

export type {
  CreateIdentityCacheServiceDependencies,
  IdentityCacheService,
  IdentityCacheServiceConfig,
  IdentityCacheServiceInput,
};
