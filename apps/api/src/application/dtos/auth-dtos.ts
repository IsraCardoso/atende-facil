/** DTOs de autenticação. Contratos de entrada/saída entre interface HTTP e use cases — nunca expõem entidades de domínio. */
import type {
  SafeUserProfile,
  TenantEntity,
  TenantMembershipEntity,
} from "../../domain/auth-entities";
import type { EmailAddress, TenantId, UserId, UserRole } from "../../domain/auth-types";
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
  actorRole: UserRole;
  correlationId: string;
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
  tenantSlug?: string;
}>;

type LoginOutput = Readonly<{
  accessToken: string;
  claims: JwtTokenClaims;
  user: SafeUserProfile;
}>;

type GetCurrentUserInput = Readonly<{
  userId: UserId;
  tenantId: TenantId;
  correlationId: string;
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
