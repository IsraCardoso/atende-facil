import { describe, expect, it } from "vitest";

import {
  createEmailAddress,
  createTenantEntity,
  createTenantId,
  createTenantMembershipEntity,
  createTenantMembershipId,
  createTenantSlug,
  createUserEntity,
  createUserId,
  type TenantId,
} from "../../domain";
import type { AuthTokenPort, JwtTokenIssueInput, PasswordHasherPort } from "../../domain/ports";
import { createInMemoryAuthRepositories } from "../../infrastructure/repositories";
import { isAppError } from "../errors/app-error";
import { createLoginUseCase } from "./login-use-case";

function createPasswordHasherStub(): PasswordHasherPort {
  return {
    async hash(plainText) {
      return `hash:${plainText}`;
    },
    async verify(plainText, hash) {
      return hash === `hash:${plainText}`;
    },
  };
}

function createAuthTokenStub(): Readonly<{
  port: AuthTokenPort;
  getLastIssuedClaims: () => JwtTokenIssueInput | null;
}> {
  let lastIssuedClaims: JwtTokenIssueInput | null = null;

  return {
    port: {
      async issue(claims) {
        lastIssuedClaims = claims;
        return "token-issued";
      },
      async verify() {
        if (!lastIssuedClaims) {
          throw new Error("No claims issued");
        }

        return {
          ...lastIssuedClaims,
          iat: 1712400000,
          exp: 1712403600,
        };
      },
    },
    getLastIssuedClaims() {
      return lastIssuedClaims;
    },
  };
}

async function seedUserTenantMembership(
  input: Readonly<{
    tenantId: TenantId;
    tenantSlug: string;
    email: string;
    passwordHash: string;
    membershipStatus: "active" | "suspended";
  }>,
) {
  const repositories = createInMemoryAuthRepositories();
  await repositories.tenantRepository.create(
    createTenantEntity({
      id: input.tenantId,
      name: "Tenant Seed",
      slug: input.tenantSlug,
    }),
  );
  await repositories.userRepository.create(
    createUserEntity({
      id: createUserId("seed-user"),
      email: createEmailAddress(input.email),
      displayName: "User Seed",
      passwordHash: input.passwordHash,
    }),
  );
  await repositories.membershipRepository.create(
    createTenantMembershipEntity({
      id: createTenantMembershipId("seed-membership"),
      tenantId: input.tenantId,
      userId: createUserId("seed-user"),
      role: "manager",
      status: input.membershipStatus,
    }),
  );

  return repositories;
}

describe("createLoginUseCase", () => {
  it("should return access token and claims for valid multi-tenant login", async () => {
    const passwordHasher = createPasswordHasherStub();
    const repositories = await seedUserTenantMembership({
      tenantId: createTenantId("tenant-login"),
      tenantSlug: "tenant-login",
      email: "login@tenant.dev",
      passwordHash: await passwordHasher.hash("valid-secret"),
      membershipStatus: "active",
    });
    const authTokenStub = createAuthTokenStub();
    const useCase = createLoginUseCase({
      userRepository: repositories.userRepository,
      tenantRepository: repositories.tenantRepository,
      membershipRepository: repositories.membershipRepository,
      passwordHasher,
      authTokenPort: authTokenStub.port,
      tenantMode: {
        multiTenant: true,
      },
    });

    const output = await useCase.execute({
      email: createEmailAddress("login@tenant.dev"),
      password: "valid-secret",
      tenantSlug: "tenant-login",
    });

    expect(output.accessToken).toBe("token-issued");
    expect(output.claims.tenantId).toBe(createTenantId("tenant-login"));
    expect(output.claims.role).toBe("manager");
    expect(authTokenStub.getLastIssuedClaims()?.sub).toBe(createUserId("seed-user"));
  });

  it("should reject login without tenant slug in multi-tenant mode", async () => {
    const passwordHasher = createPasswordHasherStub();
    const repositories = await seedUserTenantMembership({
      tenantId: createTenantId("tenant-require-slug"),
      tenantSlug: "tenant-require-slug",
      email: "missing-slug@tenant.dev",
      passwordHash: await passwordHasher.hash("valid-secret"),
      membershipStatus: "active",
    });
    const useCase = createLoginUseCase({
      userRepository: repositories.userRepository,
      tenantRepository: repositories.tenantRepository,
      membershipRepository: repositories.membershipRepository,
      passwordHasher,
      authTokenPort: createAuthTokenStub().port,
      tenantMode: {
        multiTenant: true,
      },
    });

    try {
      await useCase.execute({
        email: createEmailAddress("missing-slug@tenant.dev"),
        password: "valid-secret",
      });
      throw new Error("Expected AUTH_TENANT_REQUIRED");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("AUTH_TENANT_REQUIRED");
      }
    }
  });

  it("should reject login when tenant slug does not exist", async () => {
    const passwordHasher = createPasswordHasherStub();
    const repositories = createInMemoryAuthRepositories();
    await repositories.userRepository.create(
      createUserEntity({
        id: createUserId("user-no-tenant"),
        email: createEmailAddress("user-no-tenant@atende.dev"),
        displayName: "User No Tenant",
        passwordHash: await passwordHasher.hash("valid-secret"),
      }),
    );
    const useCase = createLoginUseCase({
      userRepository: repositories.userRepository,
      tenantRepository: repositories.tenantRepository,
      membershipRepository: repositories.membershipRepository,
      passwordHasher,
      authTokenPort: createAuthTokenStub().port,
      tenantMode: {
        multiTenant: true,
      },
    });

    try {
      await useCase.execute({
        email: createEmailAddress("user-no-tenant@atende.dev"),
        password: "valid-secret",
        tenantSlug: "missing-tenant",
      });
      throw new Error("Expected TENANT_NOT_FOUND");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("TENANT_NOT_FOUND");
      }
    }
  });

  it("should reject login with invalid credentials", async () => {
    const passwordHasher = createPasswordHasherStub();
    const repositories = await seedUserTenantMembership({
      tenantId: createTenantId("tenant-invalid-credentials"),
      tenantSlug: "tenant-invalid-credentials",
      email: "invalid-credentials@tenant.dev",
      passwordHash: await passwordHasher.hash("correct-secret"),
      membershipStatus: "active",
    });
    const useCase = createLoginUseCase({
      userRepository: repositories.userRepository,
      tenantRepository: repositories.tenantRepository,
      membershipRepository: repositories.membershipRepository,
      passwordHasher,
      authTokenPort: createAuthTokenStub().port,
      tenantMode: {
        multiTenant: true,
      },
    });

    try {
      await useCase.execute({
        email: createEmailAddress("invalid-credentials@tenant.dev"),
        password: "wrong-secret",
        tenantSlug: "tenant-invalid-credentials",
      });
      throw new Error("Expected AUTH_INVALID_CREDENTIALS");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("AUTH_INVALID_CREDENTIALS");
      }
    }
  });

  it("should reject login for suspended membership", async () => {
    const passwordHasher = createPasswordHasherStub();
    const repositories = await seedUserTenantMembership({
      tenantId: createTenantId("tenant-suspended"),
      tenantSlug: "tenant-suspended",
      email: "suspended@tenant.dev",
      passwordHash: await passwordHasher.hash("valid-secret"),
      membershipStatus: "suspended",
    });
    const useCase = createLoginUseCase({
      userRepository: repositories.userRepository,
      tenantRepository: repositories.tenantRepository,
      membershipRepository: repositories.membershipRepository,
      passwordHasher,
      authTokenPort: createAuthTokenStub().port,
      tenantMode: {
        multiTenant: true,
      },
    });

    try {
      await useCase.execute({
        email: createEmailAddress("suspended@tenant.dev"),
        password: "valid-secret",
        tenantSlug: "tenant-suspended",
      });
      throw new Error("Expected AUTH_FORBIDDEN");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("AUTH_FORBIDDEN");
      }
    }
  });

  it("should allow single-tenant login without tenant slug", async () => {
    const passwordHasher = createPasswordHasherStub();
    const defaultTenantId = createTenantId("tenant-default-single");
    const repositories = createInMemoryAuthRepositories();
    await repositories.tenantRepository.create(
      createTenantEntity({
        id: defaultTenantId,
        name: "Tenant Single",
        slug: createTenantSlug("tenant-single"),
      }),
    );
    await repositories.userRepository.create(
      createUserEntity({
        id: createUserId("single-user"),
        email: createEmailAddress("single-user@tenant.dev"),
        displayName: "Single User",
        passwordHash: await passwordHasher.hash("single-secret"),
      }),
    );
    await repositories.membershipRepository.create(
      createTenantMembershipEntity({
        id: createTenantMembershipId("single-membership"),
        tenantId: defaultTenantId,
        userId: createUserId("single-user"),
        role: "admin",
        status: "active",
      }),
    );
    const authTokenStub = createAuthTokenStub();
    const useCase = createLoginUseCase({
      userRepository: repositories.userRepository,
      tenantRepository: repositories.tenantRepository,
      membershipRepository: repositories.membershipRepository,
      passwordHasher,
      authTokenPort: authTokenStub.port,
      tenantMode: {
        multiTenant: false,
        defaultTenantId,
      },
    });

    const output = await useCase.execute({
      email: createEmailAddress("single-user@tenant.dev"),
      password: "single-secret",
    });

    expect(output.claims.tenantId).toBe(defaultTenantId);
    expect(authTokenStub.getLastIssuedClaims()?.tenantId).toBe(defaultTenantId);
  });
});
