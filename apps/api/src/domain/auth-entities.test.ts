import { describe, expect, it } from "vitest";

import {
  createTenantEntity,
  createTenantMembershipEntity,
  createUserEntity,
  toSafeUserProfile,
} from "./auth-entities";
import {
  createEmailAddress,
  createTenantId,
  createTenantMembershipId,
  createUserId,
} from "./auth-types";

describe("auth-entities", () => {
  it("should create user entity and hide password hash from safe profile", () => {
    const createdAt = new Date("2026-04-06T10:00:00.000Z");
    const user = createUserEntity({
      id: createUserId("user-1"),
      email: createEmailAddress("user@acme.com"),
      displayName: "Alice",
      passwordHash: "hash-123",
      createdAt,
      updatedAt: createdAt,
    });
    const safeProfile = toSafeUserProfile(user);

    expect(user.passwordHash).toBe("hash-123");
    expect(safeProfile).toEqual({
      id: "user-1",
      email: "user@acme.com",
      displayName: "Alice",
      createdAt,
      updatedAt: createdAt,
    });
    expect("passwordHash" in safeProfile).toBe(false);
  });

  it("should create tenant and tenant membership with validated role/status", () => {
    const tenant = createTenantEntity({
      id: createTenantId("tenant-1"),
      name: "Acme",
      slug: "acme",
    });
    const membership = createTenantMembershipEntity({
      id: createTenantMembershipId("membership-1"),
      tenantId: createTenantId("tenant-1"),
      userId: createUserId("user-1"),
      role: "manager",
      status: "active",
    });

    expect(tenant.slug).toBe("acme");
    expect(membership.role).toBe("manager");
    expect(membership.status).toBe("active");
  });

  it("should reject invalid role in membership creation", () => {
    expect(() =>
      createTenantMembershipEntity({
        id: createTenantMembershipId("membership-2"),
        tenantId: createTenantId("tenant-1"),
        userId: createUserId("user-1"),
        role: "owner",
        status: "active",
      }),
    ).toThrowError("UserRole invalido: owner.");
  });
});
