import {
  createTenantEntity,
  createTenantId,
  createTenantMembershipEntity,
  createTenantMembershipId,
  createTenantSlug,
  createUserEntity,
  createUserId,
  requireNonEmptyString,
  toSafeUserProfile,
} from "../../domain";
import type {
  MembershipRepositoryPort,
  PasswordHasherPort,
  TenantRepositoryPort,
  UserRepositoryPort,
} from "../../domain/ports";
import type { RegisterTenantInput, RegisterTenantOutput } from "../dtos/auth-dtos";
import { createAppError } from "../errors/app-error";
import type { IdentityCacheService } from "../services";
import type { AuthTenantMode } from "./login-use-case";

type IdGenerator = () => string;

type RegisterTenantUseCaseDependencies = Readonly<{
  tenantRepository: TenantRepositoryPort;
  userRepository: UserRepositoryPort;
  membershipRepository: MembershipRepositoryPort;
  passwordHasher: PasswordHasherPort;
  identityCacheService: IdentityCacheService;
  tenantMode: AuthTenantMode;
  idGenerator?: IdGenerator;
}>;

type RegisterTenantUseCase = Readonly<{
  execute: (input: RegisterTenantInput) => Promise<RegisterTenantOutput>;
}>;

function defaultIdGenerator(): string {
  return crypto.randomUUID();
}

export function createRegisterTenantUseCase(
  dependencies: RegisterTenantUseCaseDependencies,
): RegisterTenantUseCase {
  const {
    tenantRepository,
    userRepository,
    membershipRepository,
    passwordHasher,
    identityCacheService,
    tenantMode,
    idGenerator = defaultIdGenerator,
  } = dependencies;

  return {
    async execute(input: RegisterTenantInput): Promise<RegisterTenantOutput> {
      let tenantSlug: ReturnType<typeof createTenantSlug>;

      try {
        tenantSlug = createTenantSlug(input.tenantSlug);
      } catch (error: unknown) {
        throw createAppError(
          "REQUEST_VALIDATION_ERROR",
          "Slug do tenant inválido.",
          undefined,
          error,
        );
      }

      const existingTenant = await tenantRepository.findBySlug(tenantSlug);

      if (existingTenant) {
        throw createAppError(
          "TENANT_SLUG_ALREADY_EXISTS",
          "Já existe um tenant com o slug informado.",
        );
      }

      const existingUser = await userRepository.findByEmail(input.adminEmail);

      if (existingUser) {
        throw createAppError("USER_EMAIL_ALREADY_EXISTS", "O e-mail informado já está em uso.");
      }

      let password: string;

      try {
        password = requireNonEmptyString(input.adminPassword, "RegisterTenant.adminPassword");
      } catch (error: unknown) {
        throw createAppError(
          "REQUEST_VALIDATION_ERROR",
          "Senha do administrador inválida.",
          undefined,
          error,
        );
      }

      const passwordHash = await passwordHasher.hash(password);

      if (!tenantMode.multiTenant) {
        const existingDefaultTenant = await tenantRepository.findById(tenantMode.defaultTenantId);

        if (existingDefaultTenant) {
          throw createAppError(
            "TENANT_CONTEXT_CONFLICT",
            "O tenant padrão já está cadastrado para este ambiente single-tenant.",
          );
        }
      }

      const tenantId = tenantMode.multiTenant
        ? createTenantId(idGenerator())
        : tenantMode.defaultTenantId;
      const adminUserId = createUserId(idGenerator());

      const createdEntities = (() => {
        try {
          const tenant = createTenantEntity({
            id: tenantId,
            name: input.tenantName,
            slug: tenantSlug,
          });

          const adminUser = createUserEntity({
            id: adminUserId,
            email: input.adminEmail,
            displayName: input.adminDisplayName,
            passwordHash,
          });

          const membership = createTenantMembershipEntity({
            id: createTenantMembershipId(idGenerator()),
            tenantId: tenant.id,
            userId: adminUser.id,
            role: "admin",
            status: "active",
          });

          return {
            tenant,
            adminUser,
            membership,
          };
        } catch (error: unknown) {
          throw createAppError(
            "REQUEST_VALIDATION_ERROR",
            "Payload de cadastro inválido.",
            undefined,
            error,
          );
        }
      })();
      const { tenant, adminUser, membership } = createdEntities;

      await tenantRepository.create(tenant);
      await userRepository.create(adminUser);
      await membershipRepository.create(membership);
      await identityCacheService.invalidate({
        tenantId: membership.tenantId,
        userId: membership.userId,
        correlationId: "system",
      });

      return {
        tenant,
        adminUser: toSafeUserProfile(adminUser),
        membership,
      };
    },
  };
}

export type { RegisterTenantUseCase, RegisterTenantUseCaseDependencies };
