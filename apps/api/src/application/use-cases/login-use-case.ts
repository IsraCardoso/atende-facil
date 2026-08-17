/** Use case de autenticação. Valida credenciais, resolve tenant e emite JWT com claims de RBAC. */
import {
  createTenantSlug,
  requireNonEmptyString,
  type TenantId,
  toSafeUserProfile,
  type UserEntity,
} from "../../domain";
import type {
  AuthTokenPort,
  MembershipRepositoryPort,
  PasswordHasherPort,
  TenantRepositoryPort,
  UserRepositoryPort,
} from "../../domain/ports";
import type { LoginInput, LoginOutput } from "../dtos/auth-dtos";
import { createAppError } from "../errors/app-error";

type AuthTenantMode =
  | Readonly<{
      multiTenant: true;
    }>
  | Readonly<{
      multiTenant: false;
      defaultTenantId: TenantId;
    }>;

type LoginUseCaseDependencies = Readonly<{
  userRepository: UserRepositoryPort;
  tenantRepository: TenantRepositoryPort;
  membershipRepository: MembershipRepositoryPort;
  passwordHasher: PasswordHasherPort;
  authTokenPort: AuthTokenPort;
  tenantMode: AuthTenantMode;
}>;

type LoginUseCase = Readonly<{
  execute: (input: LoginInput) => Promise<LoginOutput>;
}>;

/** Deriva o tenant pelas memberships ativas do usuário quando tenantSlug não é informado. */
async function resolveTenantIdByEmail(
  user: UserEntity,
  dependencies: Pick<LoginUseCaseDependencies, "tenantRepository" | "membershipRepository">,
): Promise<TenantId> {
  const { tenantRepository, membershipRepository } = dependencies;
  const memberships = await membershipRepository.listByUserId(user.id);
  const activeMemberships = memberships.filter((membership) => membership.status === "active");

  if (activeMemberships.length === 0) {
    throw createAppError("AUTH_FORBIDDEN", "Usuário sem vínculo ativo com nenhum tenant.");
  }

  const [onlyMembership] = activeMemberships;

  if (activeMemberships.length === 1 && onlyMembership) {
    return onlyMembership.tenantId;
  }

  const candidateTenants = await Promise.all(
    activeMemberships.map((membership) =>
      tenantRepository.findById(membership.tenantId).catch(() => null),
    ),
  );
  const tenants = candidateTenants
    .filter((tenant): tenant is NonNullable<typeof tenant> => tenant !== null)
    .map((tenant) => ({ slug: tenant.slug, name: tenant.name }));

  throw createAppError(
    "AUTH_TENANT_AMBIGUOUS",
    "E-mail vinculado a múltiplos tenants; selecione um para continuar.",
    { tenants },
  );
}

async function resolveTenantId(
  input: LoginInput,
  user: UserEntity,
  dependencies: Pick<
    LoginUseCaseDependencies,
    "tenantRepository" | "tenantMode" | "membershipRepository"
  >,
): Promise<TenantId> {
  const { tenantRepository, tenantMode, membershipRepository } = dependencies;

  if (!tenantMode.multiTenant) {
    return tenantMode.defaultTenantId;
  }

  const rawTenantSlug = input.tenantSlug?.trim();

  if (!rawTenantSlug) {
    return resolveTenantIdByEmail(user, { tenantRepository, membershipRepository });
  }

  let tenantSlug: ReturnType<typeof createTenantSlug>;

  try {
    tenantSlug = createTenantSlug(rawTenantSlug);
  } catch (error: unknown) {
    throw createAppError(
      "REQUEST_VALIDATION_ERROR",
      "tenantSlug inválido para o contexto de login.",
      undefined,
      error,
    );
  }

  const tenant = await tenantRepository.findBySlug(tenantSlug);

  if (!tenant) {
    throw createAppError("TENANT_NOT_FOUND", "Tenant não encontrado para o slug informado.");
  }

  return tenant.id;
}

export function createLoginUseCase(dependencies: LoginUseCaseDependencies): LoginUseCase {
  const {
    userRepository,
    tenantRepository,
    membershipRepository,
    passwordHasher,
    authTokenPort,
    tenantMode,
  } = dependencies;

  return {
    async execute(input: LoginInput): Promise<LoginOutput> {
      let password: string;

      try {
        password = requireNonEmptyString(input.password, "Login.password");
      } catch (error: unknown) {
        throw createAppError(
          "REQUEST_VALIDATION_ERROR",
          "Senha inválida para autenticação.",
          undefined,
          error,
        );
      }

      const user = await userRepository.findByEmail(input.email);

      if (!user) {
        throw createAppError("AUTH_INVALID_CREDENTIALS", "Credenciais inválidas.");
      }

      const isPasswordValid = await passwordHasher.verify(password, user.passwordHash);

      if (!isPasswordValid) {
        throw createAppError("AUTH_INVALID_CREDENTIALS", "Credenciais inválidas.");
      }

      const tenantId = await resolveTenantId(input, user, {
        tenantRepository,
        tenantMode,
        membershipRepository,
      });
      const membership = await membershipRepository.findByUserAndTenant(user.id, tenantId);

      if (!membership || membership.status !== "active") {
        throw createAppError(
          "AUTH_FORBIDDEN",
          "Usuário sem vínculo ativo para o tenant selecionado.",
        );
      }

      const accessToken = await authTokenPort.issue({
        sub: user.id,
        tenantId: membership.tenantId,
        role: membership.role,
      });
      const claims = await authTokenPort.verify(accessToken);

      return {
        accessToken,
        claims,
        user: toSafeUserProfile(user),
      };
    },
  };
}

export type { AuthTenantMode, LoginUseCase, LoginUseCaseDependencies };
