type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

type UserId = Brand<string, "UserId">;
type TenantId = Brand<string, "TenantId">;
type TenantMembershipId = Brand<string, "TenantMembershipId">;
type EmailAddress = Brand<string, "EmailAddress">;
type TenantSlug = Brand<string, "TenantSlug">;

type UserRole = "admin" | "manager" | "agent";
type MembershipStatus = "active" | "invited" | "suspended";

const acceptedUserRoles: readonly UserRole[] = ["admin", "manager", "agent"];
const acceptedMembershipStatuses: readonly MembershipStatus[] = ["active", "invited", "suspended"];

function requireNonEmptyString(rawValue: string, fieldName: string): string {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    throw new Error(`${fieldName} invalido: valor vazio.`);
  }

  return trimmedValue;
}

function createUserId(rawValue: string): UserId {
  return requireNonEmptyString(rawValue, "UserId") as UserId;
}

function createTenantId(rawValue: string): TenantId {
  return requireNonEmptyString(rawValue, "TenantId") as TenantId;
}

function createTenantMembershipId(rawValue: string): TenantMembershipId {
  return requireNonEmptyString(rawValue, "TenantMembershipId") as TenantMembershipId;
}

function createEmailAddress(rawValue: string): EmailAddress {
  const normalizedEmail = requireNonEmptyString(rawValue, "Email").toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    throw new Error(`Email invalido: ${rawValue}.`);
  }

  return normalizedEmail as EmailAddress;
}

function createTenantSlug(rawValue: string): TenantSlug {
  const normalizedSlug = requireNonEmptyString(rawValue, "TenantSlug").toLowerCase();
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  if (!slugPattern.test(normalizedSlug)) {
    throw new Error(`TenantSlug invalido: ${rawValue}. Use apenas letras, numeros e hifen.`);
  }

  return normalizedSlug as TenantSlug;
}

function createUserRole(rawValue: string): UserRole {
  if (acceptedUserRoles.includes(rawValue as UserRole)) {
    return rawValue as UserRole;
  }

  throw new Error(`UserRole invalido: ${rawValue}.`);
}

function createMembershipStatus(rawValue: string): MembershipStatus {
  if (acceptedMembershipStatuses.includes(rawValue as MembershipStatus)) {
    return rawValue as MembershipStatus;
  }

  throw new Error(`MembershipStatus invalido: ${rawValue}.`);
}

export type {
  EmailAddress,
  MembershipStatus,
  TenantId,
  TenantMembershipId,
  TenantSlug,
  UserId,
  UserRole,
};
export {
  createEmailAddress,
  createMembershipStatus,
  createTenantId,
  createTenantMembershipId,
  createTenantSlug,
  createUserId,
  createUserRole,
  requireNonEmptyString,
};
