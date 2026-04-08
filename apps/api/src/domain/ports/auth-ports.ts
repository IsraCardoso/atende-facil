import type {
  SafeUserProfile,
  TenantEntity,
  TenantMembershipEntity,
  UserEntity,
} from "../auth-entities";
import type { EmailAddress, TenantId, TenantSlug, UserId, UserRole } from "../auth-types";

type JwtTokenIssueInput = Readonly<{
  sub: UserId;
  tenantId: TenantId;
  role: UserRole;
}>;

type JwtTokenClaims = JwtTokenIssueInput &
  Readonly<{
    iat: number;
    exp: number;
  }>;

/** Port de persistência de usuários. Implementado por in-memory (dev/test) ou Drizzle (prod). */
type UserRepositoryPort = Readonly<{
  create: (user: UserEntity) => Promise<UserEntity>;
  findById: (userId: UserId) => Promise<UserEntity | null>;
  findByEmail: (email: EmailAddress) => Promise<UserEntity | null>;
}>;

/** Port de persistência de tenants. Garante isolamento multi-tenant via tenant_id. */
type TenantRepositoryPort = Readonly<{
  create: (tenant: TenantEntity) => Promise<TenantEntity>;
  findById: (tenantId: TenantId) => Promise<TenantEntity | null>;
  findBySlug: (slug: TenantSlug) => Promise<TenantEntity | null>;
  updateTimezone: (tenantId: TenantId, timezone: string) => Promise<void>;
}>;

type MembershipRepositoryPort = Readonly<{
  create: (membership: TenantMembershipEntity) => Promise<TenantMembershipEntity>;
  findByUserAndTenant: (
    userId: UserId,
    tenantId: TenantId,
  ) => Promise<TenantMembershipEntity | null>;
  listByUserId: (userId: UserId) => Promise<readonly TenantMembershipEntity[]>;
}>;

/** Port de emissão e verificação de JWT. Desacoplado do algoritmo de assinatura. */
type AuthTokenPort = Readonly<{
  issue: (claims: JwtTokenIssueInput) => Promise<string>;
  verify: (token: string) => Promise<JwtTokenClaims>;
}>;

/** Port de hashing de senhas. Permite trocar algoritmo sem impactar use cases. */
type PasswordHasherPort = Readonly<{
  hash: (plainText: string) => Promise<string>;
  verify: (plainText: string, hash: string) => Promise<boolean>;
}>;

type CacheEntry = Readonly<{
  key: string;
  value: unknown;
  ttlSeconds: number;
}>;

/** Port genérico de cache com TTL. Usado por Valkey (prod) ou in-memory (dev/test). */
type CachePort = Readonly<{
  get: <TValue>(key: string) => Promise<TValue | null>;
  set: (entry: CacheEntry) => Promise<void>;
  delete: (key: string) => Promise<void>;
}>;

type LoggerMetadata = Readonly<{
  correlationId: string;
  tenantId?: TenantId;
  context?: Readonly<Record<string, unknown>>;
}>;

/** Port de logging estruturado. Garante correlationId em toda cadeia de chamadas. */
type AppLoggerPort = Readonly<{
  debug: (message: string, metadata: LoggerMetadata) => void;
  info: (message: string, metadata: LoggerMetadata) => void;
  warn: (message: string, metadata: LoggerMetadata) => void;
  error: (message: string, metadata: LoggerMetadata) => void;
}>;

type CurrentUserProjection = Readonly<{
  user: SafeUserProfile;
  memberships: readonly TenantMembershipEntity[];
}>;

export type {
  AppLoggerPort,
  AuthTokenPort,
  CacheEntry,
  CachePort,
  CurrentUserProjection,
  JwtTokenClaims,
  JwtTokenIssueInput,
  LoggerMetadata,
  MembershipRepositoryPort,
  PasswordHasherPort,
  TenantRepositoryPort,
  UserRepositoryPort,
};
