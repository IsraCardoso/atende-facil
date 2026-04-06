import { describe, expect, it, vi } from "vitest";
import { createAuthModule } from "../../infrastructure/auth";
import type { ApiEnvironment } from "../../infrastructure/config/env";
import { createApiServer } from "./create-api-server";

function createTestEnvironment(): ApiEnvironment {
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
  };
}

function createAppUnderTest() {
  const environment = createTestEnvironment();
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
  });

  it("should return 401 when token is missing", async () => {
    const { app } = createAppUnderTest();

    const response = await app.handle(new Request("http://localhost/auth/me"));
    const payload = await parseJsonObject(response);

    expect(response.status).toBe(401);
    expect(payload.code).toBe("AUTH_UNAUTHORIZED");
  });

  it("should require tenantSlug when multi-tenant login is used", async () => {
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

    expect(loginResponse.status).toBe(400);
    expect(loginPayload.code).toBe("AUTH_TENANT_REQUIRED");
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
});
