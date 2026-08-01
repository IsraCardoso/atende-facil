import { describe, expect, it, vi } from "vitest";
import { createAuthModule } from "../../infrastructure/auth";
import type { ApiEnvironment } from "../../infrastructure/config/env";
import { createApiServer } from "./create-api-server";

function createTestEnvironment(overrides: Partial<ApiEnvironment> = {}): ApiEnvironment {
  return {
    nodeEnv: "development",
    apiHost: "127.0.0.1",
    apiPort: 3000,
    databaseUrl: "postgresql://postgres:postgres@localhost:5432/spec_driven_dev",
    redisUrl: "redis://localhost:6379",
    logLevel: "debug",
    multiTenant: true,
    defaultTenantId: null,
    authSecret: "test-secret",
    authTokenTtlSeconds: 3600,
    chatwootApiUrl: null,
    chatwootApiToken: null,
    chatwootAccountId: null,
    chatwootInboxId: null,
    chatwootWebhookToken: null,
    chatwootAppUrl: null,
    chatwootPlatformToken: null,
    devMockWhatsappSend: false,
    corsOrigins: [],
    evolutionApiUrl: null,
    evolutionApiKey: null,
    publicApiUrl: "http://localhost:3000",
    ...overrides,
  };
}

function createAppUnderTest(environmentOverrides: Partial<ApiEnvironment> = {}) {
  const environment = createTestEnvironment(environmentOverrides);
  const infoLogSpy = vi.fn();
  const logger = {
    debug: vi.fn(),
    info: infoLogSpy,
    warn: vi.fn(),
    error: vi.fn(),
  };
  const app = createApiServer({
    environment,
    logger,
    auth: createAuthModule({
      environment,
      logger,
    }),
  });

  return {
    app,
    infoLogSpy,
  };
}

async function parseJsonObject(response: Response): Promise<Readonly<Record<string, unknown>>> {
  return (await response.json()) as Readonly<Record<string, unknown>>;
}

describe("createApiServer", () => {
  it("should return healthcheck with status 200 and correlation id header", async () => {
    const { app, infoLogSpy } = createAppUnderTest();

    const response = await app.handle(new Request("http://localhost/health"));
    const payload = await parseJsonObject(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBeTruthy();
    expect(payload).toEqual({
      status: "ok",
      environment: "development",
    });
    expect(infoLogSpy).toHaveBeenCalledTimes(1);
  });

  it("should preserve correlation id from request header", async () => {
    const { app, infoLogSpy } = createAppUnderTest();
    const expectedCorrelationId = "req-correlation-123";

    const response = await app.handle(
      new Request("http://localhost/health", {
        headers: {
          "x-correlation-id": expectedCorrelationId,
        },
      }),
    );

    expect(response.headers.get("x-correlation-id")).toBe(expectedCorrelationId);
    expect(infoLogSpy).toHaveBeenCalledWith(
      "Healthcheck processado com sucesso.",
      expect.objectContaining({
        correlationId: expectedCorrelationId,
      }),
    );
  });

  it("should register tenant, login and return current user", async () => {
    const { app } = createAppUnderTest();
    const registerResponse = await app.handle(
      new Request("http://localhost/auth/register-tenant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tenantName: "Tenant Demo",
          tenantSlug: "tenant-demo",
          adminDisplayName: "Admin Demo",
          adminEmail: "admin@demo.com",
          adminPassword: "super-secret",
        }),
      }),
    );
    const registerPayload = await parseJsonObject(registerResponse);

    expect(registerResponse.status).toBe(201);
    expect(registerPayload.tenant).toBeTruthy();
    expect(registerPayload.adminUser).toBeTruthy();
    expect(
      (registerPayload.adminUser as Readonly<Record<string, unknown>>).passwordHash,
    ).toBeUndefined();
    expect(
      (registerPayload.adminUser as Readonly<Record<string, unknown>>).adminPassword,
    ).toBeUndefined();

    const loginResponse = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "admin@demo.com",
          password: "super-secret",
          tenantSlug: "tenant-demo",
        }),
      }),
    );
    const loginPayload = await parseJsonObject(loginResponse);
    const accessToken = loginPayload.accessToken;

    expect(loginResponse.status).toBe(200);
    expect(typeof accessToken).toBe("string");

    const meResponse = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: {
          authorization: `Bearer ${String(accessToken)}`,
        },
      }),
    );
    const mePayload = await parseJsonObject(meResponse);

    expect(meResponse.status).toBe(200);
    expect(mePayload.user).toBeTruthy();
    expect(mePayload.memberships).toBeTruthy();
    expect((mePayload.user as Readonly<Record<string, unknown>>).passwordHash).toBeUndefined();
  });

  it("should return 401 when token is missing", async () => {
    const { app } = createAppUnderTest();

    const response = await app.handle(new Request("http://localhost/auth/me"));
    const payload = await parseJsonObject(response);

    expect(response.status).toBe(401);
    expect(payload.code).toBe("AUTH_UNAUTHORIZED");
  });

  it("should derive the tenant from email when no tenantSlug is given and the user has a single membership", async () => {
    const { app } = createAppUnderTest();

    await app.handle(
      new Request("http://localhost/auth/register-tenant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tenantName: "Tenant Missing Slug",
          tenantSlug: "tenant-missing-slug",
          adminDisplayName: "Admin Missing Slug",
          adminEmail: "admin-missing-slug@demo.com",
          adminPassword: "super-secret",
        }),
      }),
    );

    const loginResponse = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "admin-missing-slug@demo.com",
          password: "super-secret",
        }),
      }),
    );
    const loginPayload = await parseJsonObject(loginResponse);

    expect(loginResponse.status).toBe(200);
    expect(loginPayload.accessToken).toBeTypeOf("string");
  });

  it("should return 401 for invalid bearer token", async () => {
    const { app } = createAppUnderTest();

    const response = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: {
          authorization: "Bearer invalid-token",
        },
      }),
    );
    const payload = await parseJsonObject(response);

    expect(response.status).toBe(401);
    expect(payload.code).toBe("AUTH_UNAUTHORIZED");
  });

  it("should ignore tenant id from body and use token tenant context", async () => {
    const { app } = createAppUnderTest();

    await app.handle(
      new Request("http://localhost/auth/register-tenant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tenantName: "Tenant Context",
          tenantSlug: "tenant-context",
          adminDisplayName: "Admin Context",
          adminEmail: "admin-context@demo.com",
          adminPassword: "super-secret",
        }),
      }),
    );

    const loginResponse = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "admin-context@demo.com",
          password: "super-secret",
          tenantSlug: "tenant-context",
        }),
      }),
    );
    const loginPayload = await parseJsonObject(loginResponse);
    const adminToken = String(loginPayload.accessToken);
    const tokenTenantId = (loginPayload.claims as Readonly<Record<string, unknown>>)
      .tenantId as string;

    const createUserResponse = await app.handle(
      new Request("http://localhost/auth/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          tenantId: "tenant-injected-from-body",
          displayName: "Usuário Context",
          email: "user-context@demo.com",
          password: "context-secret",
          role: "agent",
        }),
      }),
    );
    const createUserPayload = await parseJsonObject(createUserResponse);
    const membership = createUserPayload.membership as Readonly<Record<string, unknown>>;

    expect(createUserResponse.status).toBe(201);
    expect(membership.tenantId).toBe(tokenTenantId);
    expect(membership.tenantId).not.toBe("tenant-injected-from-body");
  });

  it("should return 403 when role is not allowed", async () => {
    const { app } = createAppUnderTest();

    await app.handle(
      new Request("http://localhost/auth/register-tenant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tenantName: "Tenant RBAC",
          tenantSlug: "tenant-rbac",
          adminDisplayName: "Admin RBAC",
          adminEmail: "admin-rbac@demo.com",
          adminPassword: "super-secret",
        }),
      }),
    );

    const adminLoginResponse = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "admin-rbac@demo.com",
          password: "super-secret",
          tenantSlug: "tenant-rbac",
        }),
      }),
    );
    const adminLoginPayload = await parseJsonObject(adminLoginResponse);
    const adminToken = String(adminLoginPayload.accessToken);

    const createManagerResponse = await app.handle(
      new Request("http://localhost/auth/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          displayName: "Manager RBAC",
          email: "manager-rbac@demo.com",
          password: "manager-secret",
          role: "manager",
        }),
      }),
    );

    expect(createManagerResponse.status).toBe(201);

    const managerLoginResponse = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "manager-rbac@demo.com",
          password: "manager-secret",
          tenantSlug: "tenant-rbac",
        }),
      }),
    );
    const managerLoginPayload = await parseJsonObject(managerLoginResponse);
    const managerToken = String(managerLoginPayload.accessToken);

    const forbiddenResponse = await app.handle(
      new Request("http://localhost/auth/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          displayName: "Agent RBAC",
          email: "agent-rbac@demo.com",
          password: "agent-secret",
          role: "agent",
        }),
      }),
    );
    const forbiddenPayload = await parseJsonObject(forbiddenResponse);

    expect(forbiddenResponse.status).toBe(403);
    expect(forbiddenPayload.code).toBe("AUTH_FORBIDDEN");
  });

  it("should support single-tenant login without tenantSlug", async () => {
    const defaultTenantId = "tenant-single-default";
    const { app } = createAppUnderTest({
      multiTenant: false,
      defaultTenantId,
    });

    const registerResponse = await app.handle(
      new Request("http://localhost/auth/register-tenant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tenantName: "Tenant Single",
          tenantSlug: "tenant-single",
          adminDisplayName: "Admin Single",
          adminEmail: "admin-single@demo.com",
          adminPassword: "single-secret",
        }),
      }),
    );
    const registerPayload = await parseJsonObject(registerResponse);
    const registeredTenant = registerPayload.tenant as Readonly<Record<string, unknown>>;

    expect(registerResponse.status).toBe(201);
    expect(registeredTenant.id).toBe(defaultTenantId);

    const loginResponse = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "admin-single@demo.com",
          password: "single-secret",
        }),
      }),
    );
    const loginPayload = await parseJsonObject(loginResponse);
    const claims = loginPayload.claims as Readonly<Record<string, unknown>>;

    expect(loginResponse.status).toBe(200);
    expect(claims.tenantId).toBe(defaultTenantId);
  });

  async function registerTenantAndLogin(
    app: ReturnType<typeof createAppUnderTest>["app"],
    input: Readonly<{ tenantSlug: string; adminEmail: string }>,
  ): Promise<string> {
    await app.handle(
      new Request("http://localhost/auth/register-tenant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenantName: "Tenant Deprovisioning",
          tenantSlug: input.tenantSlug,
          adminDisplayName: "Admin",
          adminEmail: input.adminEmail,
          adminPassword: "super-secret",
        }),
      }),
    );

    const loginResponse = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: input.adminEmail,
          password: "super-secret",
          tenantSlug: input.tenantSlug,
        }),
      }),
    );
    const loginPayload = await parseJsonObject(loginResponse);
    return String(loginPayload.accessToken);
  }

  async function createMember(
    app: ReturnType<typeof createAppUnderTest>["app"],
    adminToken: string,
    input: Readonly<{ email: string; role: string }>,
  ): Promise<string> {
    const response = await app.handle(
      new Request("http://localhost/auth/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          displayName: "Member",
          email: input.email,
          password: "member-secret",
          role: input.role,
        }),
      }),
    );
    const payload = await parseJsonObject(response);
    const user = payload.user as Readonly<Record<string, unknown>>;
    return String(user.id);
  }

  it("should deactivate a tenant member via POST /auth/users/:userId/deactivate", async () => {
    const { app } = createAppUnderTest();
    const adminToken = await registerTenantAndLogin(app, {
      tenantSlug: "tenant-deactivate",
      adminEmail: "admin-deactivate@demo.com",
    });
    const memberId = await createMember(app, adminToken, {
      email: "member-deactivate@demo.com",
      role: "agent",
    });

    const response = await app.handle(
      new Request(`http://localhost/auth/users/${memberId}/deactivate`, {
        method: "POST",
        headers: { authorization: `Bearer ${adminToken}` },
      }),
    );
    const payload = await parseJsonObject(response);

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
  });

  it("should remove a tenant member via DELETE /auth/users/:userId", async () => {
    const { app } = createAppUnderTest();
    const adminToken = await registerTenantAndLogin(app, {
      tenantSlug: "tenant-remove",
      adminEmail: "admin-remove@demo.com",
    });
    const memberId = await createMember(app, adminToken, {
      email: "member-remove@demo.com",
      role: "agent",
    });

    const response = await app.handle(
      new Request(`http://localhost/auth/users/${memberId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${adminToken}` },
      }),
    );
    const payload = await parseJsonObject(response);

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
  });

  it("should reject deactivate/remove without permission (403) for a non-admin actor", async () => {
    const { app } = createAppUnderTest();
    const adminToken = await registerTenantAndLogin(app, {
      tenantSlug: "tenant-forbidden",
      adminEmail: "admin-forbidden@demo.com",
    });
    const agentEmail = "agent-forbidden@demo.com";
    await createMember(app, adminToken, { email: agentEmail, role: "agent" });

    const agentLoginResponse = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: agentEmail,
          password: "member-secret",
          tenantSlug: "tenant-forbidden",
        }),
      }),
    );
    const agentLoginPayload = await parseJsonObject(agentLoginResponse);
    const agentToken = String(agentLoginPayload.accessToken);

    const response = await app.handle(
      new Request("http://localhost/auth/users/nonexistent-user/deactivate", {
        method: "POST",
        headers: { authorization: `Bearer ${agentToken}` },
      }),
    );
    const payload = await parseJsonObject(response);

    expect(response.status).toBe(403);
    expect(payload.code).toBe("AUTH_FORBIDDEN");
  });

  it("should reject self-deactivation (403 MEMBERSHIP_SELF_ACTION_FORBIDDEN)", async () => {
    const { app } = createAppUnderTest();
    const adminToken = await registerTenantAndLogin(app, {
      tenantSlug: "tenant-self-action",
      adminEmail: "admin-self@demo.com",
    });
    const meResponse = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: { authorization: `Bearer ${adminToken}` },
      }),
    );
    const mePayload = await parseJsonObject(meResponse);
    const adminId = String((mePayload.user as Readonly<Record<string, unknown>>).id);

    const response = await app.handle(
      new Request(`http://localhost/auth/users/${adminId}/deactivate`, {
        method: "POST",
        headers: { authorization: `Bearer ${adminToken}` },
      }),
    );
    const payload = await parseJsonObject(response);

    expect(response.status).toBe(403);
    expect(payload.code).toBe("MEMBERSHIP_SELF_ACTION_FORBIDDEN");
  });

  it("should reject deactivating the last active admin (409 MEMBERSHIP_LAST_ADMIN)", async () => {
    const { app } = createAppUnderTest();
    const adminToken = await registerTenantAndLogin(app, {
      tenantSlug: "tenant-last-admin",
      adminEmail: "admin-last-1@demo.com",
    });

    // Promove um segundo admin (agora 2 admins ativos), depois usa ESSE segundo
    // admin como ator pra deprovisionar o primeiro (nao e self-action) — o tenant
    // fica com 1 admin ativo (o segundo). Deprovisionar esse ultimo restante,
    // pelo mesmo ator, e o caminho real que dispara MEMBERSHIP_LAST_ADMIN.
    const secondAdminEmail = "admin-last-2@demo.com";
    await createMember(app, adminToken, { email: secondAdminEmail, role: "admin" });
    const secondAdminLoginResponse = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: secondAdminEmail,
          password: "member-secret",
          tenantSlug: "tenant-last-admin",
        }),
      }),
    );
    const secondAdminLoginPayload = await parseJsonObject(secondAdminLoginResponse);
    const secondAdminToken = String(secondAdminLoginPayload.accessToken);

    const meResponse = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: { authorization: `Bearer ${adminToken}` },
      }),
    );
    const mePayload = await parseJsonObject(meResponse);
    const firstAdminId = String((mePayload.user as Readonly<Record<string, unknown>>).id);

    const demoteFirstAdminResponse = await app.handle(
      new Request(`http://localhost/auth/users/${firstAdminId}/deactivate`, {
        method: "POST",
        headers: { authorization: `Bearer ${secondAdminToken}` },
      }),
    );
    expect(demoteFirstAdminResponse.status).toBe(200);

    const secondMeResponse = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: { authorization: `Bearer ${secondAdminToken}` },
      }),
    );
    const secondMePayload = await parseJsonObject(secondMeResponse);
    const secondAdminId = String((secondMePayload.user as Readonly<Record<string, unknown>>).id);

    const lastAdminResponse = await app.handle(
      new Request(`http://localhost/auth/users/${secondAdminId}/deactivate`, {
        method: "POST",
        headers: { authorization: `Bearer ${adminToken}` },
      }),
    );
    const lastAdminPayload = await parseJsonObject(lastAdminResponse);

    expect(lastAdminResponse.status).toBe(409);
    expect(lastAdminPayload.code).toBe("MEMBERSHIP_LAST_ADMIN");
  });
});
