/** Testes unitarios dos repositorios Drizzle de auth — valida contratos dos ports via mock DB. */
import { describe, expect, it, vi } from "vitest";

import {
  createTenantEntity,
  createTenantMembershipEntity,
  createUserEntity,
} from "../../domain/auth-entities";
import {
  createEmailAddress,
  createTenantId,
  createTenantMembershipId,
  createTenantSlug,
  createUserId,
} from "../../domain/auth-types";
import { createDrizzleMembershipRepository } from "./drizzle-membership-repository";
import { createDrizzleTenantRepository } from "./drizzle-tenant-repository";
import { createDrizzleUserRepository } from "./drizzle-user-repository";

function createMockDb() {
  const mockReturning = vi.fn();
  const mockLimit = vi.fn();
  const mockWhere = vi.fn();

  const chainableSelect = {
    from: vi.fn().mockReturnValue({
      where: mockWhere.mockReturnValue({
        limit: mockLimit,
      }),
    }),
  };

  const chainableInsert = {
    values: vi.fn().mockReturnValue({
      returning: mockReturning,
    }),
  };

  const db = {
    select: vi.fn().mockReturnValue(chainableSelect),
    insert: vi.fn().mockReturnValue(chainableInsert),
    testHelpers: { mockReturning, mockLimit, mockWhere, chainableSelect, chainableInsert },
  };

  return db;
}

const now = new Date("2026-04-07T00:00:00Z");

const tenantRow = {
  id: "t-001",
  name: "Test Tenant",
  slug: "test-tenant",
  createdAt: now,
  updatedAt: now,
};

const userRow = {
  id: "u-001",
  email: "test@test.com",
  displayName: "Test User",
  passwordHash: "$2b$10$hash",
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

const membershipRow = {
  id: "m-001",
  tenantId: "t-001",
  userId: "u-001",
  role: "admin",
  status: "active",
  createdAt: now,
  updatedAt: now,
};

describe("DrizzleTenantRepository", () => {
  it("should create tenant and return entity", async () => {
    const db = createMockDb();
    db.testHelpers.mockReturning.mockResolvedValue([tenantRow]);

    const repo = createDrizzleTenantRepository(db as never);
    const tenant = createTenantEntity({
      id: createTenantId("t-001"),
      name: "Test Tenant",
      slug: "test-tenant",
      createdAt: now,
      updatedAt: now,
    });

    const result = await repo.create(tenant);

    expect(result.id).toBe("t-001");
    expect(result.name).toBe("Test Tenant");
    expect(result.slug).toBe("test-tenant");
  });

  it("should return tenant by id when found", async () => {
    const db = createMockDb();
    db.testHelpers.mockLimit.mockResolvedValue([tenantRow]);

    const repo = createDrizzleTenantRepository(db as never);
    const result = await repo.findById(createTenantId("t-001"));

    expect(result).not.toBeNull();
    expect(result?.id).toBe("t-001");
  });

  it("should return null when tenant not found by id", async () => {
    const db = createMockDb();
    db.testHelpers.mockLimit.mockResolvedValue([]);

    const repo = createDrizzleTenantRepository(db as never);
    const result = await repo.findById(createTenantId("nonexistent"));

    expect(result).toBeNull();
  });

  it("should return tenant by slug when found", async () => {
    const db = createMockDb();
    db.testHelpers.mockLimit.mockResolvedValue([tenantRow]);

    const repo = createDrizzleTenantRepository(db as never);
    const result = await repo.findBySlug(createTenantSlug("test-tenant"));

    expect(result).not.toBeNull();
    expect(result?.slug).toBe("test-tenant");
  });

  it("should return null when tenant not found by slug", async () => {
    const db = createMockDb();
    db.testHelpers.mockLimit.mockResolvedValue([]);

    const repo = createDrizzleTenantRepository(db as never);
    const result = await repo.findBySlug(createTenantSlug("nonexistent"));

    expect(result).toBeNull();
  });
});

describe("DrizzleUserRepository", () => {
  it("should create user and return entity", async () => {
    const db = createMockDb();
    db.testHelpers.mockReturning.mockResolvedValue([userRow]);

    const repo = createDrizzleUserRepository(db as never);
    const user = createUserEntity({
      id: createUserId("u-001"),
      email: createEmailAddress("test@test.com"),
      displayName: "Test User",
      passwordHash: "$2b$10$hash",
      createdAt: now,
      updatedAt: now,
    });

    const result = await repo.create(user);

    expect(result.id).toBe("u-001");
    expect(result.email).toBe("test@test.com");
    expect(result.displayName).toBe("Test User");
  });

  it("should return user by id when found", async () => {
    const db = createMockDb();
    db.testHelpers.mockLimit.mockResolvedValue([userRow]);

    const repo = createDrizzleUserRepository(db as never);
    const result = await repo.findById(createUserId("u-001"));

    expect(result).not.toBeNull();
    expect(result?.id).toBe("u-001");
  });

  it("should return null when user not found by id", async () => {
    const db = createMockDb();
    db.testHelpers.mockLimit.mockResolvedValue([]);

    const repo = createDrizzleUserRepository(db as never);
    const result = await repo.findById(createUserId("nonexistent"));

    expect(result).toBeNull();
  });

  it("should return user by email when found", async () => {
    const db = createMockDb();
    db.testHelpers.mockLimit.mockResolvedValue([userRow]);

    const repo = createDrizzleUserRepository(db as never);
    const result = await repo.findByEmail(createEmailAddress("test@test.com"));

    expect(result).not.toBeNull();
    expect(result?.email).toBe("test@test.com");
  });

  it("should return null when user not found by email", async () => {
    const db = createMockDb();
    db.testHelpers.mockLimit.mockResolvedValue([]);

    const repo = createDrizzleUserRepository(db as never);
    const result = await repo.findByEmail(createEmailAddress("notfound@test.com"));

    expect(result).toBeNull();
  });
});

describe("DrizzleMembershipRepository", () => {
  it("should create membership and return entity", async () => {
    const db = createMockDb();
    db.testHelpers.mockReturning.mockResolvedValue([membershipRow]);

    const repo = createDrizzleMembershipRepository(db as never);
    const membership = createTenantMembershipEntity({
      id: createTenantMembershipId("m-001"),
      tenantId: createTenantId("t-001"),
      userId: createUserId("u-001"),
      role: "admin",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    const result = await repo.create(membership);

    expect(result.id).toBe("m-001");
    expect(result.tenantId).toBe("t-001");
    expect(result.role).toBe("admin");
  });

  it("should return membership by user and tenant when found", async () => {
    const db = createMockDb();
    db.testHelpers.mockLimit.mockResolvedValue([membershipRow]);

    const repo = createDrizzleMembershipRepository(db as never);
    const result = await repo.findByUserAndTenant(createUserId("u-001"), createTenantId("t-001"));

    expect(result).not.toBeNull();
    expect(result?.id).toBe("m-001");
  });

  it("should return null when membership not found", async () => {
    const db = createMockDb();
    db.testHelpers.mockLimit.mockResolvedValue([]);

    const repo = createDrizzleMembershipRepository(db as never);
    const result = await repo.findByUserAndTenant(createUserId("u-999"), createTenantId("t-999"));

    expect(result).toBeNull();
  });

  it("should list memberships by user id", async () => {
    const db = createMockDb();
    const mockFrom = {
      where: vi
        .fn()
        .mockResolvedValue([membershipRow, { ...membershipRow, id: "m-002", role: "agent" }]),
    };
    db.select.mockReturnValue({ from: vi.fn().mockReturnValue(mockFrom) });

    const repo = createDrizzleMembershipRepository(db as never);
    const result = await repo.listByUserId(createUserId("u-001"));

    expect(result).toHaveLength(2);
    expect(result[0]?.role).toBe("admin");
    expect(result[1]?.role).toBe("agent");
  });

  it("should return empty array when no memberships for user", async () => {
    const db = createMockDb();
    const mockFrom = {
      where: vi.fn().mockResolvedValue([]),
    };
    db.select.mockReturnValue({ from: vi.fn().mockReturnValue(mockFrom) });

    const repo = createDrizzleMembershipRepository(db as never);
    const result = await repo.listByUserId(createUserId("u-999"));

    expect(result).toHaveLength(0);
  });
});
