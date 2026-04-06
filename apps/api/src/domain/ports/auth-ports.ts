import type {
  SafeUserProfile,
  TenantEntity,
  TenantMembershipEntity,
  UserEntity,
} from "../auth-entities";
import type { EmailAddress, TenantId, UserId, UserRole } from "../auth-types";

type JwtTokenClaims = Readonly<{
  userId: UserId;
  tenantId: TenantId;
  role: UserRole;
  issuedAtEpochSeconds: number;
  expiresAtEpochSeconds: number;
}>;

type UserRepositoryPort = Readonly<{
  create: (user: UserEntity) => Promise<UserEntity>;
  findById: (userId: UserId) => Promise<UserEntity | null>;
  findByEmail: (email: EmailAddress) => Promise<UserEntity | null>;
}>;

type TenantRepositoryPort = Readonly<{
  create: (tenant: TenantEntity) => Promise<TenantEntity>;
  findById: (tenantId: TenantId) => Promise<TenantEntity | null>;
  findBySlug: (slug: string) => Promise<TenantEntity | null>;
}>;

type MembershipRepositoryPort = Readonly<{
  create: (membership: TenantMembershipEntity) => Promise<TenantMembershipEntity>;
  findByUserAndTenant: (
    userId: UserId,
    tenantId: TenantId,
  ) => Promise<TenantMembershipEntity | null>;
  listByUserId: (userId: UserId) => Promise<readonly TenantMembershipEntity[]>;
}>;

type AuthTokenPort = Readonly<{
  issue: (claims: JwtTokenClaims) => Promise<string>;
  verify: (token: string) => Promise<JwtTokenClaims>;
}>;

type PasswordHasherPort = Readonly<{
  hash: (plainText: string) => Promise<string>;
  verify: (plainText: string, hash: string) => Promise<boolean>;
}>;

type CacheEntry = Readonly<{
  key: string;
  value: unknown;
  ttlSeconds: number;
}>;

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
  LoggerMetadata,
  MembershipRepositoryPort,
  PasswordHasherPort,
  TenantRepositoryPort,
  UserRepositoryPort,
};
