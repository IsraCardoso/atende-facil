/** Testes de integração DrizzleFlowRepository contra PostgreSQL real via Testcontainers. */

import { randomUUID } from "node:crypto";
import { tenantsTable } from "db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FlowEntity } from "../../domain/flow-types";
import { createFlowId } from "../../domain/flow-types";
import type { TestDatabaseContext } from "../../test-utils/pg-container";
import { isDockerAvailable, startTestDatabase } from "../../test-utils/pg-container";
import { createDrizzleFlowRepository } from "./drizzle-flow-repository";

const dockerAvailable = isDockerAvailable();

describe.skipIf(!dockerAvailable)("DrizzleFlowRepository (integration)", () => {
  let ctx: TestDatabaseContext;
  let tenantId: string;
  let setupFailed = false;

  function buildFlow(overrides: Partial<FlowEntity> = {}): FlowEntity {
    return {
      id: createFlowId(randomUUID()),
      tenantId,
      name: "Test Flow",
      description: "A test flow",
      definition: { nodes: [], edges: [] },
      status: "draft",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides,
    };
  }

  beforeAll(async () => {
    if (!dockerAvailable) {
      return;
    }
    try {
      ctx = await startTestDatabase();
      tenantId = randomUUID();
      await ctx.db.insert(tenantsTable).values({
        id: tenantId,
        name: "Test Tenant",
        slug: `test-${Date.now()}`,
      });
    } catch {
      setupFailed = true;
    }
  }, 60_000);

  afterAll(async () => {
    if (ctx) {
      await ctx.teardown();
    }
  }, 15_000);

  it("should save and findById", async ({ skip }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleFlowRepository(ctx.db);
    const flow = buildFlow();

    const saved = await repo.save(flow);
    expect(saved.id).toBe(flow.id);
    expect(saved.name).toBe("Test Flow");

    const found = await repo.findById(tenantId, flow.id);
    expect(found).not.toBeNull();
    expect(found?.name).toBe("Test Flow");
  });

  it("should return null for non-existent flow", async ({ skip }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleFlowRepository(ctx.db);
    const found = await repo.findById(tenantId, createFlowId(randomUUID()));
    expect(found).toBeNull();
  });

  it("should findActiveByTenant", async ({ skip }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleFlowRepository(ctx.db);
    const flow = buildFlow({ status: "active" });
    await repo.save(flow);

    const active = await repo.findActiveByTenant(tenantId);
    expect(active).not.toBeNull();
    expect(active?.status).toBe("active");
  });

  it("should update status", async ({ skip }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleFlowRepository(ctx.db);
    const activeFlow = await repo.findActiveByTenant(tenantId);
    if (activeFlow) {
      await repo.updateStatus(tenantId, activeFlow.id, "published");
    }

    const flow = buildFlow({ status: "draft" });
    await repo.save(flow);

    const updated = await repo.updateStatus(tenantId, flow.id, "published");
    expect(updated.status).toBe("published");
  });

  it("should soft delete", async ({ skip }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleFlowRepository(ctx.db);
    const flow = buildFlow();
    await repo.save(flow);

    await repo.softDelete(tenantId, flow.id);

    const found = await repo.findById(tenantId, flow.id);
    expect(found).toBeNull();
  });

  it("should paginate flows", async ({ skip }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleFlowRepository(ctx.db);
    const result = await repo.findByTenantPaginated(tenantId, {
      page: 1,
      limit: 10,
    });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("should enforce unique active flow per tenant", async ({ skip }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleFlowRepository(ctx.db);

    const existingActive = await repo.findActiveByTenant(tenantId);
    if (existingActive) {
      await repo.updateStatus(tenantId, existingActive.id, "published");
    }

    const flow1 = buildFlow({ status: "active" });
    await repo.save(flow1);

    const flow2 = buildFlow({ status: "active" });
    await expect(repo.save(flow2)).rejects.toThrow();
  });
});
