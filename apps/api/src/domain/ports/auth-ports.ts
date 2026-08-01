/** Ports de persistência e infraestrutura de autenticação/autorização (usuários, tenants, memberships, JWT, cache, logging). */
import type {
  SafeUserProfile,
  TenantEntity,
  TenantMembershipEntity,
  UserEntity,
} from "../auth-entities";
import type {
  EmailAddress,
  MembershipStatus,
  TenantId,
  TenantMembershipId,
  TenantSlug,
  UserId,
  UserRole,
} from "../auth-types";

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
  /** Persiste o vínculo com o espelho do usuário no Chatwoot, criado sob demanda no primeiro SSO. */
  setChatwootUserId: (userId: UserId, chatwootUserId: string) => Promise<void>;
}>;

/** Port de persistência de tenants. Garante isolamento multi-tenant via tenant_id. */
type TenantRepositoryPort = Readonly<{
  create: (tenant: TenantEntity) => Promise<TenantEntity>;
  findById: (tenantId: TenantId) => Promise<TenantEntity | null>;
  findBySlug: (slug: TenantSlug) => Promise<TenantEntity | null>;
  updateTimezone: (tenantId: TenantId, timezone: string) => Promise<void>;
}>;

type LastAdminGuardFailure = Readonly<{ ok: false; reason: "LAST_ADMIN" }>;

type UpdateStatusIfNotLastAdminResult =
  | Readonly<{ ok: true; membership: TenantMembershipEntity }>
  | LastAdminGuardFailure;

type RemoveIfNotLastAdminResult = Readonly<{ ok: true }> | LastAdminGuardFailure;

type MembershipRepositoryPort = Readonly<{
  create: (membership: TenantMembershipEntity) => Promise<TenantMembershipEntity>;
  findByUserAndTenant: (
    userId: UserId,
    tenantId: TenantId,
  ) => Promise<TenantMembershipEntity | null>;
  listByUserId: (userId: UserId) => Promise<readonly TenantMembershipEntity[]>;
  /** Lista todos os memberships de um tenant. */
  listByTenant: (tenantId: TenantId) => Promise<readonly TenantMembershipEntity[]>;
  /**
   * Aplica o guard de último-admin e a mutação de status em uma única operação atômica
   * (transação + row lock nas memberships admin/active do tenant) — elimina a janela TOCTOU
   * entre ler o count de admins e escrever o novo status. Única forma de mudar status —
   * não existe `updateStatus` bruto/sem guard neste port (evita reabrir a corrida corrigida).
   */
  updateStatusIfNotLastAdmin: (
    tenantId: TenantId,
    membershipId: TenantMembershipId,
    status: MembershipStatus,
  ) => Promise<UpdateStatusIfNotLastAdminResult>;
  /**
   * Mesma garantia atômica de `updateStatusIfNotLastAdmin`, para remoção (hard delete).
   * Única forma de remover — não existe `remove` bruto/sem guard neste port.
   * Sem soft-delete: `unique(tenantId, userId)` exige liberar o vínculo pra permitir re-convite.
   */
  removeIfNotLastAdmin: (tenantId: TenantId, userId: UserId) => Promise<RemoveIfNotLastAdminResult>;
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
  RemoveIfNotLastAdminResult,
  TenantRepositoryPort,
  UpdateStatusIfNotLastAdminResult,
  UserRepositoryPort,
};
