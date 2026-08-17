/**
 * Remove permanentemente o membership de um usuário no tenant (hard delete). Revoga o acesso
 * ao Chatwoot daquele tenant best-effort — falha na revogação nunca bloqueia a remoção (RN-019).
 */
import type { UserRole } from "../../domain";
import type { TenantId, UserId } from "../../domain/auth-types";
import type {
  AppLoggerPort,
  MembershipRepositoryPort,
  UserRepositoryPort,
} from "../../domain/ports";
import type { ChatwootPlatformPortResolver } from "../../domain/ports/chatwoot-platform-ports";
import { createAppError } from "../errors/app-error";
import type { IdentityCacheService, RbacPolicyService } from "../services";
import {
  assertNotSelfAction,
  revokeChatwootAccessBestEffort,
} from "./tenant-member-deprovisioning-shared";

type RemoveTenantMemberInput = Readonly<{
  actorUserId: UserId;
  actorRole: UserRole;
  tenantId: TenantId;
  targetUserId: UserId;
  correlationId: string;
}>;

type RemoveTenantMemberOutput = Readonly<{ success: true }>;

type RemoveTenantMemberUseCase = Readonly<{
  execute: (input: RemoveTenantMemberInput) => Promise<RemoveTenantMemberOutput>;
}>;

type RemoveTenantMemberUseCaseDependencies = Readonly<{
  userRepository: UserRepositoryPort;
  membershipRepository: MembershipRepositoryPort;
  identityCacheService: IdentityCacheService;
  rbacPolicyService: RbacPolicyService;
  resolveChatwootPlatform?: ChatwootPlatformPortResolver;
  logger: AppLoggerPort;
}>;

export function createRemoveTenantMemberUseCase(
  dependencies: RemoveTenantMemberUseCaseDependencies,
): RemoveTenantMemberUseCase {
  const {
    userRepository,
    membershipRepository,
    identityCacheService,
    rbacPolicyService,
    resolveChatwootPlatform,
    logger,
  } = dependencies;

  return {
    async execute(input: RemoveTenantMemberInput): Promise<RemoveTenantMemberOutput> {
      rbacPolicyService.assertAllowed(input.actorRole, "auth.users.remove");
      assertNotSelfAction(input.actorUserId, input.targetUserId);

      const targetMembership = await membershipRepository.findByUserAndTenant(
        input.targetUserId,
        input.tenantId,
      );

      if (!targetMembership) {
        throw createAppError("MEMBERSHIP_NOT_FOUND", "Usuário não possui vínculo com este tenant.");
      }

      const guardedRemoval = await membershipRepository.removeIfNotLastAdmin(
        input.tenantId,
        input.targetUserId,
      );

      if (!guardedRemoval.ok) {
        throw createAppError(
          "MEMBERSHIP_LAST_ADMIN",
          "O tenant precisa de ao menos um administrador ativo.",
        );
      }

      await revokeChatwootAccessBestEffort(
        { userRepository, resolveChatwootPlatform, logger },
        {
          tenantId: input.tenantId,
          targetUserId: input.targetUserId,
          correlationId: input.correlationId,
        },
      );

      await identityCacheService.invalidate({
        tenantId: input.tenantId,
        userId: input.targetUserId,
        correlationId: input.correlationId,
      });

      return { success: true };
    },
  };
}

export type {
  RemoveTenantMemberInput,
  RemoveTenantMemberOutput,
  RemoveTenantMemberUseCase,
  RemoveTenantMemberUseCaseDependencies,
};
