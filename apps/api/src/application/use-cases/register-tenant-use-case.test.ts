import { describe, expect, it, vi } from "vitest";

import {
  createEmailAddress,
  createTenantEntity,
  createTenantId,
  createUserEntity,
  createUserId,
} from "../../domain";
import { createInMemoryAuthRepositories } from "../../infrastructure/repositories";
import { isAppError } from "../errors/app-error";
import { createRegisterTenantUseCase } from "./register-tenant-use-case";
import { createIdentityCacheServiceStub } from "./test-support";

describe("createRegisterTenantUseCase", () => {
  it("should create tenant admin and membership for valid multi-tenant input", async () => {
    const repositories = createInMemoryAuthRepositories();
    const invalidateSpy = vi.fn(async () => undefined);
    const useCase = createRegisterTenantUseCase({
      tenantRepository: repositories.tenantRepository,
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
      tenantMode: {
        multiTenant: true,
      },
      idGenerator: (() => {
        const ids = ["tenant-created", "user-created", "membership-created"];
        let index = 0;
        return () => {
          const value = ids[index] ?? `generated-${index}`;
          index += 1;
          return value;
        };
      })(),
    });

    const output = await useCase.execute({
      tenantName: "Tenant de Teste",
      tenantSlug: "TENANT-TESTE",
      adminDisplayName: "Admin Teste",
      adminEmail: createEmailAddress("admin@tenant-teste.dev"),
      adminPassword: "admin-secret",
    });

    expect(output.tenant.id).toBe(createTenantId("tenant-created"));
    expect(output.tenant.slug).toBe("tenant-teste");
    expect(output.adminUser.id).toBe(createUserId("user-created"));
    expect(output.membership.role).toBe("admin");
    expect(invalidateSpy).toHaveBeenCalledWith({
      tenantId: createTenantId("tenant-created"),
      userId: createUserId("user-created"),
      correlationId: "system",
    });
  });

  it("should reject duplicated tenant slug", async () => {
    const repositories = createInMemoryAuthRepositories();
    await repositories.tenantRepository.create(
      createTenantEntity({
        id: createTenantId("tenant-existing"),
        name: "Tenant Existente",
        slug: "tenant-duplicated",
      }),
    );

    const useCase = createRegisterTenantUseCase({
      tenantRepository: repositories.tenantRepository,
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
      tenantMode: {
        multiTenant: true,
      },
    });

    try {
      await useCase.execute({
        tenantName: "Outro Tenant",
        tenantSlug: "tenant-duplicated",
        adminDisplayName: "Admin",
        adminEmail: createEmailAddress("admin-dup@tenant.dev"),
        adminPassword: "admin-secret",
      });
      throw new Error("Expected TENANT_SLUG_ALREADY_EXISTS");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("TENANT_SLUG_ALREADY_EXISTS");
      }
    }
  });

  it("should reject duplicated admin e-mail", async () => {
    const repositories = createInMemoryAuthRepositories();
    await repositories.userRepository.create(
      createUserEntity({
        id: createUserId("admin-existing"),
        email: createEmailAddress("admin-existing@tenant.dev"),
        displayName: "Admin Existente",
        passwordHash: "hash:existing",
      }),
    );

    const useCase = createRegisterTenantUseCase({
      tenantRepository: repositories.tenantRepository,
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
      tenantMode: {
        multiTenant: true,
      },
    });

    try {
      await useCase.execute({
        tenantName: "Tenant Dup User",
        tenantSlug: "tenant-dup-user",
        adminDisplayName: "Admin Dup",
        adminEmail: createEmailAddress("admin-existing@tenant.dev"),
        adminPassword: "secret",
      });
      throw new Error("Expected USER_EMAIL_ALREADY_EXISTS");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("USER_EMAIL_ALREADY_EXISTS");
      }
    }
  });

  it("should reject single-tenant registration when default tenant already exists", async () => {
    const repositories = createInMemoryAuthRepositories();
    await repositories.tenantRepository.create(
      createTenantEntity({
        id: createTenantId("tenant-default"),
        name: "Default Tenant",
        slug: "default-tenant",
      }),
    );

    const useCase = createRegisterTenantUseCase({
      tenantRepository: repositories.tenantRepository,
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
      tenantMode: {
        multiTenant: false,
        defaultTenantId: createTenantId("tenant-default"),
      },
    });

    try {
      await useCase.execute({
        tenantName: "Novo Tenant",
        tenantSlug: "novo-tenant",
        adminDisplayName: "Admin",
        adminEmail: createEmailAddress("admin-new@tenant.dev"),
        adminPassword: "secret",
      });
      throw new Error("Expected TENANT_CONTEXT_CONFLICT");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("TENANT_CONTEXT_CONFLICT");
      }
    }
  });

  it("should use default tenant id in single-tenant mode", async () => {
    const repositories = createInMemoryAuthRepositories();
    const useCase = createRegisterTenantUseCase({
      tenantRepository: repositories.tenantRepository,
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
      tenantMode: {
        multiTenant: false,
        defaultTenantId: createTenantId("tenant-default"),
      },
      idGenerator: (() => {
        const ids = ["user-single", "membership-single"];
        let index = 0;
        return () => {
          const value = ids[index] ?? `generated-${index}`;
          index += 1;
          return value;
        };
      })(),
    });

    const output = await useCase.execute({
      tenantName: "Tenant Single",
      tenantSlug: "tenant-single",
      adminDisplayName: "Admin Single",
      adminEmail: createEmailAddress("admin-single@tenant.dev"),
      adminPassword: "single-secret",
    });

    expect(output.tenant.id).toBe(createTenantId("tenant-default"));
  });
});
