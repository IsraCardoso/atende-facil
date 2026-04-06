import { describe, expect, it, vi } from "vitest";

import {
  createEmailAddress,
  createTenantId,
  createTenantMembershipEntity,
  createTenantMembershipId,
  createUserEntity,
  createUserId,
} from "../../domain";
import { createInMemoryAuthRepositories } from "../../infrastructure/repositories";
import { isAppError } from "../errors/app-error";
import { createIdentityCacheService, createRbacPolicyService } from "../services";
import { createCreateUserUseCase } from "./create-user-use-case";
import { createIdentityCacheServiceStub } from "./test-support";

describe("createCreateUserUseCase", () => {
  it("should create user membership and invalidate identity cache", async () => {
    const repositories = createInMemoryAuthRepositories();
    const invalidateSpy = vi.fn(async () => undefined);
    const useCase = createCreateUserUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      passwordHasher: {
        async hash(plainText) {
          return `hash:${plainText}`;
        },
        async verify() {
          return true;
        },
      },
      identityCacheService: createIdentityCacheServiceStub({
        invalidate: invalidateSpy,
      }),
      rbacPolicyService: createRbacPolicyService(),
      idGenerator: (() => {
        const ids = ["user-created", "membership-created"];
        let index = 0;
        return () => {
          const value = ids[index] ?? `generated-${index}`;
          index += 1;
          return value;
        };
      })(),
    });

    const output = await useCase.execute({
      tenantId: createTenantId("tenant-01"),
      actorRole: "admin",
      correlationId: "corr-create-user",
      displayName: "Usuário Criado",
      email: createEmailAddress("created-user@atende.dev"),
      password: "user-secret",
      role: "manager",
    });

    expect(output.user.displayName).toBe("Usuário Criado");
    expect(output.membership.role).toBe("manager");
    expect(output.membership.tenantId).toBe(createTenantId("tenant-01"));
    expect(invalidateSpy).toHaveBeenCalledWith({
      tenantId: createTenantId("tenant-01"),
      userId: createUserId("user-created"),
      correlationId: "corr-create-user",
    });
  });

  it("should reject creation when actor role is not allowed", async () => {
    const repositories = createInMemoryAuthRepositories();
    const useCase = createCreateUserUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      passwordHasher: {
        async hash(plainText) {
          return `hash:${plainText}`;
        },
        async verify() {
          return true;
        },
      },
      identityCacheService: createIdentityCacheService({
        cachePort: {
          async get() {
            return null;
          },
          async set() {
            return undefined;
          },
          async delete() {
            return undefined;
          },
        },
        logger: {
          debug() {
            return undefined;
          },
          info() {
            return undefined;
          },
          warn() {
            return undefined;
          },
          error() {
            return undefined;
          },
        },
      }),
      rbacPolicyService: createRbacPolicyService(),
    });

    try {
      await useCase.execute({
        tenantId: createTenantId("tenant-01"),
        actorRole: "manager",
        correlationId: "corr-forbidden",
        displayName: "Usuário Bloqueado",
        email: createEmailAddress("blocked-user@atende.dev"),
        password: "manager-secret",
        role: "agent",
      });
      throw new Error("Expected AUTH_FORBIDDEN");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("AUTH_FORBIDDEN");
      }
    }
  });

  it("should reject duplicated e-mail", async () => {
    const repositories = createInMemoryAuthRepositories();
    const existingUser = createUserEntity({
      id: createUserId("existing-user"),
      email: createEmailAddress("duplicated@atende.dev"),
      displayName: "Usuário Existente",
      passwordHash: "hash:existing",
    });
    await repositories.userRepository.create(existingUser);

    const useCase = createCreateUserUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      passwordHasher: {
        async hash(plainText) {
          return `hash:${plainText}`;
        },
        async verify() {
          return true;
        },
      },
      identityCacheService: createIdentityCacheServiceStub(),
      rbacPolicyService: createRbacPolicyService(),
    });

    try {
      await useCase.execute({
        tenantId: createTenantId("tenant-dup"),
        actorRole: "admin",
        correlationId: "corr-dup",
        displayName: "Outro Usuário",
        email: createEmailAddress("duplicated@atende.dev"),
        password: "secret",
        role: "agent",
      });
      throw new Error("Expected USER_EMAIL_ALREADY_EXISTS");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("USER_EMAIL_ALREADY_EXISTS");
      }
    }
  });

  it("should reject blank password", async () => {
    const repositories = createInMemoryAuthRepositories();
    const useCase = createCreateUserUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      passwordHasher: {
        async hash(plainText) {
          return `hash:${plainText}`;
        },
        async verify() {
          return true;
        },
      },
      identityCacheService: createIdentityCacheServiceStub(),
      rbacPolicyService: createRbacPolicyService(),
    });

    try {
      await useCase.execute({
        tenantId: createTenantId("tenant-password"),
        actorRole: "admin",
        correlationId: "corr-password",
        displayName: "Usuário Senha",
        email: createEmailAddress("invalid-password@atende.dev"),
        password: "   ",
        role: "agent",
      });
      throw new Error("Expected REQUEST_VALIDATION_ERROR");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("REQUEST_VALIDATION_ERROR");
      }
    }
  });

  it("should reject invalid output payload during entity creation", async () => {
    const repositories = createInMemoryAuthRepositories();
    const useCase = createCreateUserUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      passwordHasher: {
        async hash(plainText) {
          return `hash:${plainText}`;
        },
        async verify() {
          return true;
        },
      },
      identityCacheService: createIdentityCacheServiceStub(),
      rbacPolicyService: createRbacPolicyService(),
      idGenerator: (() => {
        const ids = ["user-invalid", "membership-invalid"];
        let index = 0;
        return () => {
          const value = ids[index] ?? `generated-${index}`;
          index += 1;
          return value;
        };
      })(),
    });

    try {
      await useCase.execute({
        tenantId: createTenantId("tenant-invalid"),
        actorRole: "admin",
        correlationId: "corr-invalid-entity",
        displayName: "  ",
        email: createEmailAddress("invalid-entity@atende.dev"),
        password: "valid-secret",
        role: "agent",
      });
      throw new Error("Expected REQUEST_VALIDATION_ERROR");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("REQUEST_VALIDATION_ERROR");
      }
    }
  });

  it("should persist created membership in repository", async () => {
    const repositories = createInMemoryAuthRepositories();
    const membershipExisting = createTenantMembershipEntity({
      id: createTenantMembershipId("membership-existing"),
      tenantId: createTenantId("tenant-existing"),
      userId: createUserId("user-existing"),
      role: "admin",
      status: "active",
    });
    await repositories.membershipRepository.create(membershipExisting);

    const useCase = createCreateUserUseCase({
      userRepository: repositories.userRepository,
      membershipRepository: repositories.membershipRepository,
      passwordHasher: {
        async hash(plainText) {
          return `hash:${plainText}`;
        },
        async verify() {
          return true;
        },
      },
      identityCacheService: createIdentityCacheServiceStub(),
      rbacPolicyService: createRbacPolicyService(),
      idGenerator: (() => {
        const ids = ["user-new", "membership-new"];
        let index = 0;
        return () => {
          const value = ids[index] ?? `generated-${index}`;
          index += 1;
          return value;
        };
      })(),
    });

    const output = await useCase.execute({
      tenantId: createTenantId("tenant-existing"),
      actorRole: "admin",
      correlationId: "corr-membership",
      displayName: "Usuário Novo",
      email: createEmailAddress("user-new@atende.dev"),
      password: "new-secret",
      role: "agent",
    });
    const storedMembership = await repositories.membershipRepository.findByUserAndTenant(
      createUserId("user-new"),
      createTenantId("tenant-existing"),
    );

    expect(storedMembership?.id).toBe(output.membership.id);
  });
});
