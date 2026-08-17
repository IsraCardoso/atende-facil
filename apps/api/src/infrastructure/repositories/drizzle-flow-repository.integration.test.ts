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

  it("should demote the previous active flow and activate the target atomically", async ({
    skip,
  }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleFlowRepository(ctx.db);

    const existingActive = await repo.findActiveByTenant(tenantId);
    if (existingActive) {
      await repo.updateStatus(tenantId, existingActive.id, "published");
    }

    const previous = buildFlow({ status: "active" });
    await repo.save(previous);

    const next = buildFlow({ status: "published" });
    await repo.save(next);

    const result = await repo.activateExclusive(tenantId, next.id);

    if (!result.ok) {
      throw new Error("Expected activateExclusive to succeed");
    }
    expect(result.activated.status).toBe("active");
    expect(result.previousActiveFlow?.id).toBe(previous.id);
    expect(result.previousActiveFlow?.status).toBe("published");

    const active = await repo.findActiveByTenant(tenantId);
    expect(active?.id).toBe(next.id);
  });

  it("should resolve two concurrent activations racing against the SAME pre-existing active flow — exactly one wins", async ({
    skip,
  }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleFlowRepository(ctx.db);

    const existingActive = await repo.findActiveByTenant(tenantId);
    if (existingActive) {
      await repo.updateStatus(tenantId, existingActive.id, "published");
    }

    // Nota (achado do /review, testing persona): com um flow ativo pre-existente,
    // o vencedor da corrida pelo FOR UPDATE demove o "seed" e commita primeiro; sob
    // READ COMMITTED, o segundo transaction (que estava bloqueado no lock do "seed")
    // acorda e RE-AVALIA o WHERE contra a versao ja commitada do "seed" (agora
    // 'published') — o "seed" some do resultado, entao o 2o le "nenhum ativo" e tenta
    // ativar seu proprio alvo direto. Quem realmente barra os DOIS de vencerem e o
    // indice unico (flows_one_active_per_tenant), nao o lock em si — o lock so
    // garante atomicidade do swap demote+activate de quem vence primeiro. Por isso
    // o resultado observavel aqui e IDENTICO ao teste seguinte (sem seed): exatamente
    // 1 activateExclusive com ok:true, o outro com ok:false/ACTIVATION_CONFLICT.
    const seed = buildFlow({ status: "active" });
    await repo.save(seed);

    const flowA = buildFlow({ status: "published" });
    await repo.save(flowA);
    const flowB = buildFlow({ status: "published" });
    await repo.save(flowB);

    const results = await Promise.all([
      repo.activateExclusive(tenantId, flowA.id),
      repo.activateExclusive(tenantId, flowB.id),
    ]);

    const succeeded = results.filter((result) => result.ok);
    const conflicted = results.filter((result) => !result.ok);
    expect(succeeded).toHaveLength(1);
    expect(conflicted).toHaveLength(1);

    const paginated = await repo.findByTenantPaginated(tenantId, {
      page: 1,
      limit: 100,
      status: "active",
    });
    expect(paginated.data).toHaveLength(1);
  });

  it("should let the unique index reject a second concurrent first-activation with no prior active flow", async ({
    skip,
  }) => {
    if (setupFailed) {
      skip();
    }
    const repo = createDrizzleFlowRepository(ctx.db);

    const existingActive = await repo.findActiveByTenant(tenantId);
    if (existingActive) {
      await repo.updateStatus(tenantId, existingActive.id, "published");
    }

    const flowA = buildFlow({ status: "published" });
    await repo.save(flowA);
    const flowB = buildFlow({ status: "published" });
    await repo.save(flowB);

    // Sem flow ativo previo, o FOR UPDATE nao trava nada em comum — a defesa
    // em profundidade e o indice unico parcial (flows_one_active_per_tenant).
    // activateExclusive captura o unique_violation e devolve ok:false (nunca rejeita).
    const results = await Promise.all([
      repo.activateExclusive(tenantId, flowA.id),
      repo.activateExclusive(tenantId, flowB.id),
    ]);

    const succeeded = results.filter((result) => result.ok);
    const conflicted = results.filter((result) => !result.ok);
    expect(succeeded).toHaveLength(1);
    expect(conflicted).toHaveLength(1);

    const paginated = await repo.findByTenantPaginated(tenantId, {
      page: 1,
      limit: 100,
      status: "active",
    });
    expect(paginated.data).toHaveLength(1);
  });
});
