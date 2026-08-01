/** Testes de integração DrizzleMembershipRepository contra PostgreSQL real via Testcontainers. */

import { randomUUID } from "node:crypto";
import { tenantsTable, usersTable } from "db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTenantMembershipEntity } from "../../domain/auth-entities";
import type { TenantId, TenantMembershipId, UserId } from "../../domain/auth-types";
import { createTenantMembershipId } from "../../domain/auth-types";
import type { TestDatabaseContext } from "../../test-utils/pg-container";
import { isDockerAvailable, startTestDatabase } from "../../test-utils/pg-container";
import { createDrizzleMembershipRepository } from "./drizzle-membership-repository";

const dockerAvailable = isDockerAvailable();

describe.skipIf(!dockerAvailable)("DrizzleMembershipRepository (integration)", () => {
  let ctx: TestDatabaseContext;
  let setupFailed = false;

  async function createUser(): Promise<UserId> {
    const id = randomUUID() as UserId;
    await ctx.db.insert(usersTable).values({
      id,
      email: `${id}@test.local`,
      displayName: "Test User",
      passwordHash: "hash",
    });
    return id;
  }

  async function createTenant(): Promise<TenantId> {
    const id = randomUUID() as TenantId;
    await ctx.db.insert(tenantsTable).values({
      id,
      name: "Test Tenant",
      slug: `test-${randomUUID()}`,
    });
    return id;
  }

  beforeAll(async () => {
    if (!dockerAvailable) {
      return;
    }
    try {
      ctx = await startTestDatabase();
    } catch {
      setupFailed = true;
    }
  }, 60_000);

  afterAll(async () => {
    if (ctx) {
      await ctx.teardown();
    }
  }, 15_000);

  it("should reject deactivating the last active admin", async ({ skip }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleMembershipRepository(ctx.db);
    const tenantId = await createTenant();
    const adminUserId = await createUser();

    const admin = await repo.create(
      createTenantMembershipEntity({
        id: createTenantMembershipId(randomUUID()),
        tenantId,
        userId: adminUserId,
        role: "admin",
        status: "active",
      }),
    );

    const result = await repo.updateStatusIfNotLastAdmin(tenantId, admin.id, "suspended");
    expect(result.ok).toBe(false);
  });

  it("should allow deactivating an admin when another active admin remains", async ({ skip }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleMembershipRepository(ctx.db);
    const tenantId = await createTenant();
    const adminAUserId = await createUser();
    const adminBUserId = await createUser();

    const adminA = await repo.create(
      createTenantMembershipEntity({
        id: createTenantMembershipId(randomUUID()),
        tenantId,
        userId: adminAUserId,
        role: "admin",
        status: "active",
      }),
    );
    await repo.create(
      createTenantMembershipEntity({
        id: createTenantMembershipId(randomUUID()),
        tenantId,
        userId: adminBUserId,
        role: "admin",
        status: "active",
      }),
    );

    const result = await repo.updateStatusIfNotLastAdmin(tenantId, adminA.id, "suspended");
    expect(result.ok).toBe(true);
  });

  it("should serialize two concurrent deactivations against the last two admins — exactly one is rejected", async ({
    skip,
  }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleMembershipRepository(ctx.db);
    const tenantId = await createTenant();
    const adminAUserId = await createUser();
    const adminBUserId = await createUser();

    const adminA = await repo.create(
      createTenantMembershipEntity({
        id: createTenantMembershipId(randomUUID()),
        tenantId,
        userId: adminAUserId,
        role: "admin",
        status: "active",
      }),
    );
    const adminB = await repo.create(
      createTenantMembershipEntity({
        id: createTenantMembershipId(randomUUID()),
        tenantId,
        userId: adminBUserId,
        role: "admin",
        status: "active",
      }),
    );

    const [resultA, resultB] = await Promise.all([
      repo.updateStatusIfNotLastAdmin(tenantId, adminA.id as TenantMembershipId, "suspended"),
      repo.updateStatusIfNotLastAdmin(tenantId, adminB.id as TenantMembershipId, "suspended"),
    ]);

    const outcomes = [resultA.ok, resultB.ok];
    expect(outcomes.filter((ok) => ok === true)).toHaveLength(1);
    expect(outcomes.filter((ok) => ok === false)).toHaveLength(1);

    const remainingMemberships = await repo.listByTenant(tenantId);
    const remainingActiveAdmins = remainingMemberships.filter(
      (membership) => membership.role === "admin" && membership.status === "active",
    );
    expect(remainingActiveAdmins).toHaveLength(1);
  });

  it("should serialize concurrent removal and deactivation against the last two admins", async ({
    skip,
  }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleMembershipRepository(ctx.db);
    const tenantId = await createTenant();
    const adminAUserId = await createUser();
    const adminBUserId = await createUser();

    const adminA = await repo.create(
      createTenantMembershipEntity({
        id: createTenantMembershipId(randomUUID()),
        tenantId,
        userId: adminAUserId,
        role: "admin",
        status: "active",
      }),
    );
    await repo.create(
      createTenantMembershipEntity({
        id: createTenantMembershipId(randomUUID()),
        tenantId,
        userId: adminBUserId,
        role: "admin",
        status: "active",
      }),
    );

    const [removeResult, deactivateResult] = await Promise.all([
      repo.removeIfNotLastAdmin(tenantId, adminBUserId),
      repo.updateStatusIfNotLastAdmin(tenantId, adminA.id as TenantMembershipId, "suspended"),
    ]);

    const outcomes = [removeResult.ok, deactivateResult.ok];
    expect(outcomes.filter((ok) => ok === true)).toHaveLength(1);
    expect(outcomes.filter((ok) => ok === false)).toHaveLength(1);

    const remainingMemberships = await repo.listByTenant(tenantId);
    const remainingActiveAdmins = remainingMemberships.filter(
      (membership) => membership.role === "admin" && membership.status === "active",
    );
    expect(remainingActiveAdmins.length).toBeGreaterThanOrEqual(1);
  });
});
