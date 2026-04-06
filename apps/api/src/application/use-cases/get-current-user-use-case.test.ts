import { describe, expect, it } from "vitest";

import {
  createEmailAddress,
  createTenantId,
  createTenantMembershipEntity,
  createTenantMembershipId,
  createUserEntity,
  createUserId,
} from "../../domain";
import { createInMemoryAuthRepositories } from "../../infrastructure/repositories";
import { createAppError, isAppError } from "../errors/app-error";
import type { RbacPolicyService } from "../services";
import { createRbacPolicyService } from "../services";
import { createGetCurrentUserUseCase } from "./get-current-user-use-case";
import { createIdentityCacheServiceStub } from "./test-support";

describe("createGetCurrentUserUseCase", () => {
  it("should return cached projection when cache has value", async () => {
    const repositories = createInMemoryAuthRepositories();
    const cachedProjection = {
      user: {
        id: createUserId("cached-user"),
        email: createEmailAddress("cached-user@tenant.dev"),
        displayName: "Cached User",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      memberships: [
        {
          id: createTenantMembershipId("cached-membership"),
          tenantId: createTenantId("cached-tenant"),
          userId: createUserId("cached-user"),
          role: "agent" as const,
          status: "active" as const,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    };
    const useCase = createGetCurrentUserUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      identityCacheService: createIdentityCacheServiceStub({
        async getOrLoad() {
          return cachedProjection;
        },
      }),
      rbacPolicyService: createRbacPolicyService(),
    });

    const output = await useCase.execute({
      userId: createUserId("any-user"),
      tenantId: createTenantId("any-tenant"),
      correlationId: "corr-cache-hit",
    });

    expect(output.user.id).toBe(createUserId("cached-user"));
    expect(output.memberships[0]?.id).toBe(createTenantMembershipId("cached-membership"));
  });

  it("should load user and memberships when cache misses", async () => {
    const repositories = createInMemoryAuthRepositories();
    await repositories.userRepository.create(
      createUserEntity({
        id: createUserId("user-loader"),
        email: createEmailAddress("user-loader@tenant.dev"),
        displayName: "User Loader",
        passwordHash: "hash:loader",
      }),
    );
    await repositories.membershipRepository.create(
      createTenantMembershipEntity({
        id: createTenantMembershipId("membership-loader"),
        tenantId: createTenantId("tenant-loader"),
        userId: createUserId("user-loader"),
        role: "manager",
        status: "active",
      }),
    );

    const useCase = createGetCurrentUserUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      identityCacheService: createIdentityCacheServiceStub(),
      rbacPolicyService: createRbacPolicyService(),
    });

    const output = await useCase.execute({
      userId: createUserId("user-loader"),
      tenantId: createTenantId("tenant-loader"),
      correlationId: "corr-loader",
    });

    expect(output.user.id).toBe(createUserId("user-loader"));
    expect(output.memberships.length).toBe(1);
  });

  it("should reject when user does not exist", async () => {
    const repositories = createInMemoryAuthRepositories();
    const useCase = createGetCurrentUserUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      identityCacheService: createIdentityCacheServiceStub(),
      rbacPolicyService: createRbacPolicyService(),
    });

    try {
      await useCase.execute({
        userId: createUserId("missing-user"),
        tenantId: createTenantId("tenant"),
        correlationId: "corr-user-missing",
      });
      throw new Error("Expected USER_NOT_FOUND");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("USER_NOT_FOUND");
      }
    }
  });

  it("should reject when membership is missing", async () => {
    const repositories = createInMemoryAuthRepositories();
    await repositories.userRepository.create(
      createUserEntity({
        id: createUserId("user-without-membership"),
        email: createEmailAddress("user-without-membership@tenant.dev"),
        displayName: "User Without Membership",
        passwordHash: "hash",
      }),
    );
    const useCase = createGetCurrentUserUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      identityCacheService: createIdentityCacheServiceStub(),
      rbacPolicyService: createRbacPolicyService(),
    });

    try {
      await useCase.execute({
        userId: createUserId("user-without-membership"),
        tenantId: createTenantId("tenant-without-membership"),
        correlationId: "corr-membership-missing",
      });
      throw new Error("Expected AUTH_FORBIDDEN");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("AUTH_FORBIDDEN");
      }
    }
  });

  it("should reject when policy service denies access", async () => {
    const repositories = createInMemoryAuthRepositories();
    await repositories.userRepository.create(
      createUserEntity({
        id: createUserId("user-policy"),
        email: createEmailAddress("user-policy@tenant.dev"),
        displayName: "User Policy",
        passwordHash: "hash:policy",
      }),
    );
    await repositories.membershipRepository.create(
      createTenantMembershipEntity({
        id: createTenantMembershipId("membership-policy"),
        tenantId: createTenantId("tenant-policy"),
        userId: createUserId("user-policy"),
        role: "admin",
        status: "active",
      }),
    );
    const denyingPolicyService: RbacPolicyService = {
      isAllowed() {
        return false;
      },
      assertAllowed() {
        throw createAppError("AUTH_FORBIDDEN", "Acesso negado pela policy.");
      },
    };
    const useCase = createGetCurrentUserUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      identityCacheService: createIdentityCacheServiceStub(),
      rbacPolicyService: denyingPolicyService,
    });

    try {
      await useCase.execute({
        userId: createUserId("user-policy"),
        tenantId: createTenantId("tenant-policy"),
        correlationId: "corr-policy",
      });
      throw new Error("Expected AUTH_FORBIDDEN");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("AUTH_FORBIDDEN");
      }
    }
  });
});
