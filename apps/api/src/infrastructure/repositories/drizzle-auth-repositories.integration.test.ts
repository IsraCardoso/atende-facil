/** Testes de integração DrizzleTenantRepository contra PostgreSQL real via Testcontainers. */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTenantEntity } from "../../domain/auth-entities";
import type { TenantId, TenantSlug } from "../../domain/auth-types";
import type { TestDatabaseContext } from "../../test-utils/pg-container";
import { isDockerAvailable, startTestDatabase } from "../../test-utils/pg-container";
import { createDrizzleTenantRepository } from "./drizzle-tenant-repository";

const dockerAvailable = isDockerAvailable();

describe.skipIf(!dockerAvailable)("DrizzleTenantRepository (integration)", () => {
  let ctx: TestDatabaseContext;
  let setupFailed = false;

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

  it("should create and findById", async ({ skip }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleTenantRepository(ctx.db);
    const tenant = createTenantEntity({
      id: randomUUID() as TenantId,
      name: "Acme Corp",
      slug: `acme-${Date.now()}`,
    });

    const created = await repo.create(tenant);
    expect(created.id).toBe(tenant.id);
    expect(created.name).toBe("Acme Corp");

    const found = await repo.findById(tenant.id);
    expect(found).not.toBeNull();
    expect(found?.slug).toBe(tenant.slug);
  });

  it("should findBySlug", async ({ skip }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleTenantRepository(ctx.db);
    const slug = `slug-${Date.now()}` as TenantSlug;
    const tenant = createTenantEntity({
      id: randomUUID() as TenantId,
      name: "Slug Tenant",
      slug,
    });

    await repo.create(tenant);
    const found = await repo.findBySlug(slug);
    expect(found).not.toBeNull();
    expect(found?.name).toBe("Slug Tenant");
  });

  it("should return null for non-existent tenant", async ({ skip }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleTenantRepository(ctx.db);
    const found = await repo.findById(randomUUID() as TenantId);
    expect(found).toBeNull();
  });

  it("should enforce unique slug constraint", async ({ skip }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleTenantRepository(ctx.db);
    const sharedSlug = `unique-${Date.now()}`;

    const tenant1 = createTenantEntity({
      id: randomUUID() as TenantId,
      name: "Tenant 1",
      slug: sharedSlug,
    });
    await repo.create(tenant1);

    const tenant2 = createTenantEntity({
      id: randomUUID() as TenantId,
      name: "Tenant 2",
      slug: sharedSlug,
    });
    await expect(repo.create(tenant2)).rejects.toThrow();
  });
});
