/** Guards e revogação Chatwoot compartilhados entre deactivate/remove de membership (RN-019). */
import type { TenantMembershipEntity } from "../../domain";
import type { TenantId, UserId } from "../../domain/auth-types";
import type {
  AppLoggerPort,
  MembershipRepositoryPort,
  UserRepositoryPort,
} from "../../domain/ports";
import type { ChatwootPlatformPortResolver } from "../../domain/ports/chatwoot-platform-ports";
import { createAppError } from "../errors/app-error";

function assertNotSelfAction(actorUserId: UserId, targetUserId: UserId): void {
  if (actorUserId === targetUserId) {
    throw createAppError(
      "MEMBERSHIP_SELF_ACTION_FORBIDDEN",
      "Não é possível executar esta ação sobre o próprio acesso.",
    );
  }
}

async function assertNotLastActiveAdmin(
  membershipRepository: MembershipRepositoryPort,
  tenantId: TenantId,
  targetMembership: TenantMembershipEntity,
): Promise<void> {
  if (targetMembership.role !== "admin" || targetMembership.status !== "active") {
    return;
  }

  const allMemberships = await membershipRepository.listByTenant(tenantId);
  const activeAdmins = allMemberships.filter(
    (membership) => membership.role === "admin" && membership.status === "active",
  );

  if (activeAdmins.length <= 1) {
    throw createAppError(
      "MEMBERSHIP_LAST_ADMIN",
      "O tenant precisa de ao menos um administrador ativo.",
    );
  }
}

type RevokeChatwootAccessInput = Readonly<{
  tenantId: TenantId;
  targetUserId: UserId;
  correlationId: string;
}>;

/** Best-effort: falha na revogação nunca bloqueia a deprovisão no Atende Fácil. */
async function revokeChatwootAccessBestEffort(
  deps: Readonly<{
    userRepository: UserRepositoryPort;
    resolveChatwootPlatform: ChatwootPlatformPortResolver | undefined;
    logger: AppLoggerPort;
  }>,
  input: RevokeChatwootAccessInput,
): Promise<void> {
  if (!deps.resolveChatwootPlatform) {
    return;
  }

  const targetUser = await deps.userRepository.findById(input.targetUserId);

  if (!targetUser?.chatwootUserId) {
    return;
  }

  try {
    const chatwootPlatform = await deps.resolveChatwootPlatform(input.tenantId);
    await chatwootPlatform.revokeUserFromAccount(targetUser.chatwootUserId);
  } catch (error: unknown) {
    deps.logger.warn("Falha ao revogar acesso do usuário no Chatwoot", {
      correlationId: input.correlationId,
      tenantId: input.tenantId,
      context: {
        targetUserId: input.targetUserId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

export { assertNotLastActiveAdmin, assertNotSelfAction, revokeChatwootAccessBestEffort };
