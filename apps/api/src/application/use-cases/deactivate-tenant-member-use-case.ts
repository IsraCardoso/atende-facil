/**
 * Desativa (suspende) o membership de um usuário no tenant. Revoga o acesso ao Chatwoot
 * daquele tenant best-effort — falha na revogação nunca bloqueia a desativação (RN-019).
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
  assertNotLastActiveAdmin,
  assertNotSelfAction,
  revokeChatwootAccessBestEffort,
} from "./tenant-member-deprovisioning-shared";

type DeactivateTenantMemberInput = Readonly<{
  actorUserId: UserId;
  actorRole: UserRole;
  tenantId: TenantId;
  targetUserId: UserId;
  correlationId: string;
}>;

type DeactivateTenantMemberOutput = Readonly<{ success: true }>;

type DeactivateTenantMemberUseCase = Readonly<{
  execute: (input: DeactivateTenantMemberInput) => Promise<DeactivateTenantMemberOutput>;
}>;

type DeactivateTenantMemberUseCaseDependencies = Readonly<{
  userRepository: UserRepositoryPort;
  membershipRepository: MembershipRepositoryPort;
  identityCacheService: IdentityCacheService;
  rbacPolicyService: RbacPolicyService;
  resolveChatwootPlatform?: ChatwootPlatformPortResolver;
  logger: AppLoggerPort;
}>;

export function createDeactivateTenantMemberUseCase(
  dependencies: DeactivateTenantMemberUseCaseDependencies,
): DeactivateTenantMemberUseCase {
  const {
    userRepository,
    membershipRepository,
    identityCacheService,
    rbacPolicyService,
    resolveChatwootPlatform,
    logger,
  } = dependencies;

  return {
    async execute(input: DeactivateTenantMemberInput): Promise<DeactivateTenantMemberOutput> {
      rbacPolicyService.assertAllowed(input.actorRole, "auth.users.deactivate");
      assertNotSelfAction(input.actorUserId, input.targetUserId);

      const targetMembership = await membershipRepository.findByUserAndTenant(
        input.targetUserId,
        input.tenantId,
      );

      if (!targetMembership) {
        throw createAppError("MEMBERSHIP_NOT_FOUND", "Usuário não possui vínculo com este tenant.");
      }

      await assertNotLastActiveAdmin(membershipRepository, input.tenantId, targetMembership);
      await membershipRepository.updateStatus(targetMembership.id, "suspended");

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
  DeactivateTenantMemberInput,
  DeactivateTenantMemberOutput,
  DeactivateTenantMemberUseCase,
  DeactivateTenantMemberUseCaseDependencies,
};
