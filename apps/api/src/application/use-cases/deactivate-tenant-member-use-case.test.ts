/** Testes do DeactivateTenantMemberUseCase — RBAC, guards de último-admin/auto-ação, revogação Chatwoot best-effort. */
import { describe, expect, it, vi } from "vitest";

import {
  createEmailAddress,
  createTenantId,
  createTenantMembershipEntity,
  createTenantMembershipId,
  createUserEntity,
  createUserId,
} from "../../domain";
import type { ChatwootPlatformPort } from "../../domain/ports/chatwoot-platform-ports";
import { createInMemoryAuthRepositories } from "../../infrastructure/repositories";
import { isAppError } from "../errors/app-error";
import { createRbacPolicyService } from "../services";
import { createDeactivateTenantMemberUseCase } from "./deactivate-tenant-member-use-case";
import { createFakeLogger, createIdentityCacheServiceStub } from "./test-support";

const TENANT_ID = createTenantId("tenant-1");

function createChatwootPlatformFake(
  overrides: Partial<ChatwootPlatformPort> = {},
): ChatwootPlatformPort {
  return {
    createUser: vi.fn().mockResolvedValue("501"),
    addUserToAccount: vi.fn().mockResolvedValue(undefined),
    createSsoUrl: vi.fn().mockResolvedValue("https://chatwoot.example.com/login"),
    revokeUserFromAccount: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

async function seedAdminAndTarget(
  repositories: ReturnType<typeof createInMemoryAuthRepositories>,
  targetOverrides: Partial<{
    role: "admin" | "manager" | "agent";
    chatwootUserId: string | null;
  }> = {},
) {
  const admin = createUserEntity({
    id: createUserId("admin-user"),
    email: createEmailAddress("admin@atende.dev"),
    displayName: "Admin",
    passwordHash: "hash:admin",
  });
  const target = createUserEntity({
    id: createUserId("target-user"),
    email: createEmailAddress("target@atende.dev"),
    displayName: "Target",
    passwordHash: "hash:target",
    chatwootUserId: targetOverrides.chatwootUserId ?? null,
  });
  await repositories.userRepository.create(admin);
  await repositories.userRepository.create(target);

  await repositories.membershipRepository.create(
    createTenantMembershipEntity({
      id: createTenantMembershipId("membership-admin"),
      tenantId: TENANT_ID,
      userId: admin.id,
      role: "admin",
      status: "active",
    }),
  );
  await repositories.membershipRepository.create(
    createTenantMembershipEntity({
      id: createTenantMembershipId("membership-target"),
      tenantId: TENANT_ID,
      userId: target.id,
      role: targetOverrides.role ?? "agent",
      status: "active",
    }),
  );

  return { admin, target };
}

describe("createDeactivateTenantMemberUseCase", () => {
  it("should suspend the target membership and revoke Chatwoot access", async () => {
    const repositories = createInMemoryAuthRepositories();
    const { admin, target } = await seedAdminAndTarget(repositories, { chatwootUserId: "cw-1" });
    const chatwootPlatform = createChatwootPlatformFake();
    const useCase = createDeactivateTenantMemberUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      identityCacheService: createIdentityCacheServiceStub(),
      rbacPolicyService: createRbacPolicyService(),
      resolveChatwootPlatform: async () => chatwootPlatform,
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      actorUserId: admin.id,
      actorRole: "admin",
      tenantId: TENANT_ID,
      targetUserId: target.id,
      correlationId: "corr-1",
    });

    expect(result.success).toBe(true);
    const membership = await repositories.membershipRepository.findByUserAndTenant(
      target.id,
      TENANT_ID,
    );
    expect(membership?.status).toBe("suspended");
    expect(chatwootPlatform.revokeUserFromAccount).toHaveBeenCalledWith("cw-1");
  });

  it("should skip Chatwoot revocation when target has no chatwootUserId", async () => {
    const repositories = createInMemoryAuthRepositories();
    const { admin, target } = await seedAdminAndTarget(repositories, { chatwootUserId: null });
    const chatwootPlatform = createChatwootPlatformFake();
    const useCase = createDeactivateTenantMemberUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      identityCacheService: createIdentityCacheServiceStub(),
      rbacPolicyService: createRbacPolicyService(),
      resolveChatwootPlatform: async () => chatwootPlatform,
      logger: createFakeLogger(),
    });

    await useCase.execute({
      actorUserId: admin.id,
      actorRole: "admin",
      tenantId: TENANT_ID,
      targetUserId: target.id,
      correlationId: "corr-1",
    });

    expect(chatwootPlatform.revokeUserFromAccount).not.toHaveBeenCalled();
  });

  it("should suspend the membership even when Chatwoot revocation fails (best-effort)", async () => {
    const repositories = createInMemoryAuthRepositories();
    const { admin, target } = await seedAdminAndTarget(repositories, { chatwootUserId: "cw-1" });
    const chatwootPlatform = createChatwootPlatformFake({
      revokeUserFromAccount: vi.fn().mockRejectedValue(new Error("Chatwoot indisponível")),
    });
    const warnSpy = vi.fn();
    const useCase = createDeactivateTenantMemberUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      identityCacheService: createIdentityCacheServiceStub(),
      rbacPolicyService: createRbacPolicyService(),
      resolveChatwootPlatform: async () => chatwootPlatform,
      logger: { ...createFakeLogger(), warn: warnSpy },
    });

    const result = await useCase.execute({
      actorUserId: admin.id,
      actorRole: "admin",
      tenantId: TENANT_ID,
      targetUserId: target.id,
      correlationId: "corr-1",
    });

    expect(result.success).toBe(true);
    const membership = await repositories.membershipRepository.findByUserAndTenant(
      target.id,
      TENANT_ID,
    );
    expect(membership?.status).toBe("suspended");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("should reject when actor role is not admin", async () => {
    const repositories = createInMemoryAuthRepositories();
    const { admin, target } = await seedAdminAndTarget(repositories);
    const useCase = createDeactivateTenantMemberUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      identityCacheService: createIdentityCacheServiceStub(),
      rbacPolicyService: createRbacPolicyService(),
      logger: createFakeLogger(),
    });

    try {
      await useCase.execute({
        actorUserId: admin.id,
        actorRole: "manager",
        tenantId: TENANT_ID,
        targetUserId: target.id,
        correlationId: "corr-1",
      });
      throw new Error("Expected AUTH_FORBIDDEN");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("AUTH_FORBIDDEN");
      }
    }
  });

  it("should reject self-deactivation", async () => {
    const repositories = createInMemoryAuthRepositories();
    const { admin } = await seedAdminAndTarget(repositories);
    const useCase = createDeactivateTenantMemberUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      identityCacheService: createIdentityCacheServiceStub(),
      rbacPolicyService: createRbacPolicyService(),
      logger: createFakeLogger(),
    });

    try {
      await useCase.execute({
        actorUserId: admin.id,
        actorRole: "admin",
        tenantId: TENANT_ID,
        targetUserId: admin.id,
        correlationId: "corr-1",
      });
      throw new Error("Expected MEMBERSHIP_SELF_ACTION_FORBIDDEN");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("MEMBERSHIP_SELF_ACTION_FORBIDDEN");
      }
    }
  });

  it("should reject when target has no membership in the tenant", async () => {
    const repositories = createInMemoryAuthRepositories();
    const { admin } = await seedAdminAndTarget(repositories);
    const useCase = createDeactivateTenantMemberUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      identityCacheService: createIdentityCacheServiceStub(),
      rbacPolicyService: createRbacPolicyService(),
      logger: createFakeLogger(),
    });

    try {
      await useCase.execute({
        actorUserId: admin.id,
        actorRole: "admin",
        tenantId: TENANT_ID,
        targetUserId: createUserId("nonexistent-user"),
        correlationId: "corr-1",
      });
      throw new Error("Expected MEMBERSHIP_NOT_FOUND");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("MEMBERSHIP_NOT_FOUND");
      }
    }
  });

  it("should reject deactivating the last active admin of the tenant", async () => {
    const repositories = createInMemoryAuthRepositories();
    const solitaryAdmin = createUserEntity({
      id: createUserId("solitary-admin"),
      email: createEmailAddress("solitary-admin@atende.dev"),
      displayName: "Solitary Admin",
      passwordHash: "hash:solitary",
    });
    const actor = createUserEntity({
      id: createUserId("actor-manager"),
      email: createEmailAddress("actor-manager@atende.dev"),
      displayName: "Actor Manager",
      passwordHash: "hash:actor",
    });
    await repositories.userRepository.create(solitaryAdmin);
    await repositories.userRepository.create(actor);
    await repositories.membershipRepository.create(
      createTenantMembershipEntity({
        id: createTenantMembershipId("membership-solitary-admin"),
        tenantId: TENANT_ID,
        userId: solitaryAdmin.id,
        role: "admin",
        status: "active",
      }),
    );

    const useCase = createDeactivateTenantMemberUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      identityCacheService: createIdentityCacheServiceStub(),
      rbacPolicyService: createRbacPolicyService(),
      logger: createFakeLogger(),
    });

    try {
      await useCase.execute({
        actorUserId: actor.id,
        actorRole: "admin",
        tenantId: TENANT_ID,
        targetUserId: solitaryAdmin.id,
        correlationId: "corr-1",
      });
      throw new Error("Expected MEMBERSHIP_LAST_ADMIN");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("MEMBERSHIP_LAST_ADMIN");
      }
    }

    const membership = await repositories.membershipRepository.findByUserAndTenant(
      solitaryAdmin.id,
      TENANT_ID,
    );
    expect(membership?.status).toBe("active");
  });
});
