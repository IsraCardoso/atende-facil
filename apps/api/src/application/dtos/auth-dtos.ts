import type {
  SafeUserProfile,
  TenantEntity,
  TenantMembershipEntity,
  UserEntity,
} from "../../domain/auth-entities";
import type { EmailAddress, TenantId, UserRole } from "../../domain/auth-types";
import type { JwtTokenClaims } from "../../domain/ports/auth-ports";

type RegisterTenantInput = Readonly<{
  tenantName: string;
  tenantSlug: string;
  adminDisplayName: string;
  adminEmail: EmailAddress;
  adminPassword: string;
}>;

type RegisterTenantOutput = Readonly<{
  tenant: TenantEntity;
  adminUser: SafeUserProfile;
  membership: TenantMembershipEntity;
}>;

type CreateUserInput = Readonly<{
  tenantId: TenantId;
  displayName: string;
  email: EmailAddress;
  password: string;
  role: UserRole;
}>;

type CreateUserOutput = Readonly<{
  user: SafeUserProfile;
  membership: TenantMembershipEntity;
}>;

type LoginInput = Readonly<{
  email: EmailAddress;
  password: string;
  tenantSlug: string;
}>;

type LoginOutput = Readonly<{
  accessToken: string;
  claims: JwtTokenClaims;
  user: SafeUserProfile;
}>;

type GetCurrentUserInput = Readonly<{
  user: UserEntity;
  memberships: readonly TenantMembershipEntity[];
}>;

type GetCurrentUserOutput = Readonly<{
  user: SafeUserProfile;
  memberships: readonly TenantMembershipEntity[];
}>;

export type {
  CreateUserInput,
  CreateUserOutput,
  GetCurrentUserInput,
  GetCurrentUserOutput,
  LoginInput,
  LoginOutput,
  RegisterTenantInput,
  RegisterTenantOutput,
};
