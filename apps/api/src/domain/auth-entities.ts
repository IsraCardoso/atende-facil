import {
  createMembershipStatus,
  createTenantMembershipId,
  createTenantSlug,
  createUserId,
  createUserRole,
  type EmailAddress,
  type MembershipStatus,
  requireNonEmptyString,
  type TenantId,
  type TenantMembershipId,
  type TenantSlug,
  type UserId,
  type UserRole,
} from "./auth-types";

type UserEntity = Readonly<{
  id: UserId;
  email: EmailAddress;
  displayName: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}>;

type TenantEntity = Readonly<{
  id: TenantId;
  name: string;
  slug: TenantSlug;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}>;

type TenantMembershipEntity = Readonly<{
  id: TenantMembershipId;
  tenantId: TenantId;
  userId: UserId;
  role: UserRole;
  status: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}>;

type SafeUserProfile = Readonly<{
  id: UserId;
  email: EmailAddress;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}>;

type CreateUserEntityInput = Readonly<{
  id: UserId;
  email: EmailAddress;
  displayName: string;
  passwordHash: string;
  createdAt?: Date;
  updatedAt?: Date;
}>;

type CreateTenantEntityInput = Readonly<{
  id: TenantId;
  name: string;
  slug: string;
  timezone?: string | undefined;
  createdAt?: Date;
  updatedAt?: Date;
}>;

type CreateTenantMembershipEntityInput = Readonly<{
  id: TenantMembershipId;
  tenantId: TenantId;
  userId: UserId;
  role: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}>;

function resolveEntityDate(rawValue: Date | undefined): Date {
  return rawValue ? new Date(rawValue) : new Date();
}

function createUserEntity(input: CreateUserEntityInput): UserEntity {
  return {
    id: createUserId(input.id),
    email: input.email,
    displayName: requireNonEmptyString(input.displayName, "User.displayName"),
    passwordHash: requireNonEmptyString(input.passwordHash, "User.passwordHash"),
    createdAt: resolveEntityDate(input.createdAt),
    updatedAt: resolveEntityDate(input.updatedAt),
  };
}

function createTenantEntity(input: CreateTenantEntityInput): TenantEntity {
  return {
    id: input.id,
    name: requireNonEmptyString(input.name, "Tenant.name"),
    slug: createTenantSlug(input.slug),
    timezone: input.timezone ?? "America/Sao_Paulo",
    createdAt: resolveEntityDate(input.createdAt),
    updatedAt: resolveEntityDate(input.updatedAt),
  };
}

function createTenantMembershipEntity(
  input: CreateTenantMembershipEntityInput,
): TenantMembershipEntity {
  return {
    id: createTenantMembershipId(input.id),
    tenantId: input.tenantId,
    userId: input.userId,
    role: createUserRole(input.role),
    status: createMembershipStatus(input.status),
    createdAt: resolveEntityDate(input.createdAt),
    updatedAt: resolveEntityDate(input.updatedAt),
  };
}

function toSafeUserProfile(user: UserEntity): SafeUserProfile {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export type {
  CreateTenantEntityInput,
  CreateTenantMembershipEntityInput,
  CreateUserEntityInput,
  SafeUserProfile,
  TenantEntity,
  TenantMembershipEntity,
  UserEntity,
};
export { createTenantEntity, createTenantMembershipEntity, createUserEntity, toSafeUserProfile };
