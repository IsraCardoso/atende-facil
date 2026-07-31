/** Testes do GetChatwootSsoUrlUseCase — reuso, provisionamento lazy, mapeamento de role, degradação. */
import { describe, expect, it, vi } from "vitest";

import { createEmailAddress, createUserEntity, createUserId } from "../../domain";
import type { TenantId } from "../../domain/auth-types";
import type { ChatwootPlatformPort } from "../../domain/ports/chatwoot-platform-ports";
import { createInMemoryAuthRepositories } from "../../infrastructure/repositories";
import { createGetChatwootSsoUrlUseCase } from "./get-chatwoot-sso-url-use-case";
import { createFakeLogger } from "./test-support";

function createChatwootPlatformFake(
  overrides: Partial<ChatwootPlatformPort> = {},
): ChatwootPlatformPort {
  return {
    createUser: vi.fn().mockResolvedValue("501"),
    addUserToAccount: vi.fn().mockResolvedValue(undefined),
    createSsoUrl: vi
      .fn()
      .mockResolvedValue("https://chatwoot.example.com/login?sso_auth_token=tok"),
    ...overrides,
  };
}

async function seedUser(
  repositories: ReturnType<typeof createInMemoryAuthRepositories>,
  overrides: Partial<{ chatwootUserId: string | null; email: string }> = {},
) {
  const user = createUserEntity({
    id: createUserId(crypto.randomUUID()),
    email: createEmailAddress(overrides.email ?? "agente@netfacil.com"),
    displayName: "Agente NetFacil",
    passwordHash: "hash:x",
    chatwootUserId: overrides.chatwootUserId ?? null,
  });
  await repositories.userRepository.create(user);
  return user;
}

const TENANT_ID = "tenant-1" as TenantId;

describe("GetChatwootSsoUrlUseCase", () => {
  it("should throw when the authenticated user does not exist", async () => {
    const repositories = createInMemoryAuthRepositories();
    const chatwootPlatform = createChatwootPlatformFake();
    const useCase = createGetChatwootSsoUrlUseCase({
      userRepository: repositories.userRepository,
      resolveChatwootPlatform: async () => chatwootPlatform,
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      userId: createUserId(crypto.randomUUID()),
      role: "agent",
      correlationId: "corr-1",
      tenantId: TENANT_ID,
    });

    // O erro é capturado internamente e degrada para deep link — nunca propaga ao caller HTTP.
    expect(result.ssoUrl).toBeNull();
    expect(result.reason).toBe("Não foi possível emitir o login único do Chatwoot.");
  });

  it("should reuse the existing mirror without provisioning again", async () => {
    const repositories = createInMemoryAuthRepositories();
    const user = await seedUser(repositories, { chatwootUserId: "999" });
    const chatwootPlatform = createChatwootPlatformFake();
    const useCase = createGetChatwootSsoUrlUseCase({
      userRepository: repositories.userRepository,
      resolveChatwootPlatform: async () => chatwootPlatform,
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      userId: user.id,
      role: "agent",
      correlationId: "corr-1",
      tenantId: TENANT_ID,
    });

    expect(result.ssoUrl).toBe("https://chatwoot.example.com/login?sso_auth_token=tok");
    expect(chatwootPlatform.createUser).not.toHaveBeenCalled();
    expect(chatwootPlatform.addUserToAccount).not.toHaveBeenCalled();
    expect(chatwootPlatform.createSsoUrl).toHaveBeenCalledWith("999");
  });

  it("should provision the mirror, persist the link before binding to the account, and reach every AF role as agent", async () => {
    const repositories = createInMemoryAuthRepositories();
    const user = await seedUser(repositories);
    const callOrder: string[] = [];
    const chatwootPlatform = createChatwootPlatformFake({
      createUser: vi.fn().mockImplementation(async () => {
        callOrder.push("createUser");
        return "501";
      }),
      addUserToAccount: vi.fn().mockImplementation(async () => {
        callOrder.push("addUserToAccount");
      }),
    });
    const useCase = createGetChatwootSsoUrlUseCase({
      userRepository: repositories.userRepository,
      resolveChatwootPlatform: async () => chatwootPlatform,
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      userId: user.id,
      role: "admin",
      correlationId: "corr-1",
      tenantId: TENANT_ID,
    });

    expect(result.ssoUrl).not.toBeNull();
    expect(chatwootPlatform.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: user.email, displayName: user.displayName }),
    );
    // Nunca "administrator": mapear role local para Chatwoot administrator seria escalação
    // de privilégio via /auth/register-tenant (público, concede role admin a qualquer registro).
    expect(chatwootPlatform.addUserToAccount).toHaveBeenCalledWith({
      chatwootUserId: "501",
      role: "agent",
    });

    const persisted = await repositories.userRepository.findById(user.id);
    expect(persisted?.chatwootUserId).toBe("501");

    // O vínculo é persistido ANTES do bind à conta: uma falha em addUserToAccount não deve
    // deixar o usuário órfão sem chatwoot_user_id (o que geraria e-mail duplicado no retry).
    expect(callOrder).toEqual(["createUser", "addUserToAccount"]);
  });

  it("should keep the persisted link even when binding to the account fails", async () => {
    const repositories = createInMemoryAuthRepositories();
    const user = await seedUser(repositories);
    const chatwootPlatform = createChatwootPlatformFake({
      addUserToAccount: vi.fn().mockRejectedValue(new Error("Chatwoot indisponível")),
    });
    const useCase = createGetChatwootSsoUrlUseCase({
      userRepository: repositories.userRepository,
      resolveChatwootPlatform: async () => chatwootPlatform,
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      userId: user.id,
      role: "agent",
      correlationId: "corr-1",
      tenantId: TENANT_ID,
    });

    expect(result.ssoUrl).toBeNull();
    const persisted = await repositories.userRepository.findById(user.id);
    expect(persisted?.chatwootUserId).toBe("501");
  });

  it("should append redirect_url to the SSO url when a redirect path is provided", async () => {
    const repositories = createInMemoryAuthRepositories();
    const user = await seedUser(repositories, { chatwootUserId: "999" });
    const chatwootPlatform = createChatwootPlatformFake({
      createSsoUrl: vi
        .fn()
        .mockResolvedValue("https://chatwoot.example.com/login?sso_auth_token=tok"),
    });
    const useCase = createGetChatwootSsoUrlUseCase({
      userRepository: repositories.userRepository,
      resolveChatwootPlatform: async () => chatwootPlatform,
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      userId: user.id,
      role: "agent",
      correlationId: "corr-1",
      tenantId: TENANT_ID,
      redirectPath: "/app/accounts/1/conversations/42",
    });

    expect(result.ssoUrl).toContain(
      `redirect_url=${encodeURIComponent("/app/accounts/1/conversations/42")}`,
    );
  });

  it("should not append redirect_url when no redirect path is provided", async () => {
    const repositories = createInMemoryAuthRepositories();
    const user = await seedUser(repositories, { chatwootUserId: "999" });
    const chatwootPlatform = createChatwootPlatformFake();
    const useCase = createGetChatwootSsoUrlUseCase({
      userRepository: repositories.userRepository,
      resolveChatwootPlatform: async () => chatwootPlatform,
      logger: createFakeLogger(),
    });

    const result = await useCase.execute({
      userId: user.id,
      role: "agent",
      correlationId: "corr-1",
      tenantId: TENANT_ID,
    });

    expect(result.ssoUrl).toBe("https://chatwoot.example.com/login?sso_auth_token=tok");
  });

  it("should degrade to null with a reason when the Platform API is unreachable", async () => {
    const repositories = createInMemoryAuthRepositories();
    const user = await seedUser(repositories, { chatwootUserId: "999" });
    const chatwootPlatform = createChatwootPlatformFake({
      createSsoUrl: vi.fn().mockRejectedValue(new Error("timeout")),
    });
    const logger = createFakeLogger();
    const warnSpy = vi.spyOn(logger, "warn");
    const useCase = createGetChatwootSsoUrlUseCase({
      userRepository: repositories.userRepository,
      resolveChatwootPlatform: async () => chatwootPlatform,
      logger,
    });

    const result = await useCase.execute({
      userId: user.id,
      role: "agent",
      correlationId: "corr-1",
      tenantId: TENANT_ID,
    });

    expect(result).toEqual({
      ssoUrl: null,
      reason: "Não foi possível emitir o login único do Chatwoot.",
    });
    // O log nunca deve carregar a URL/token — só metadata de correlação.
    expect(warnSpy).toHaveBeenCalledWith(
      "Falha ao emitir SSO do Chatwoot",
      expect.objectContaining({ correlationId: "corr-1", tenantId: TENANT_ID }),
    );
    const loggedPayload = JSON.stringify(warnSpy.mock.calls[0]);
    expect(loggedPayload).not.toContain("sso_auth_token");
  });

  it("should resolve a different ChatwootPlatformPort per tenant, never a shared instance", async () => {
    const repositories = createInMemoryAuthRepositories();
    const userTenantA = await seedUser(repositories, {
      chatwootUserId: "111",
      email: "agente-a@netfacil.com",
    });
    const userTenantB = await seedUser(repositories, {
      chatwootUserId: "222",
      email: "agente-b@netfacil.com",
    });
    const tenantAPlatform = createChatwootPlatformFake({
      createSsoUrl: vi
        .fn()
        .mockResolvedValue("https://a.chatwoot.example.com/login?sso_auth_token=a"),
    });
    const tenantBPlatform = createChatwootPlatformFake({
      createSsoUrl: vi
        .fn()
        .mockResolvedValue("https://b.chatwoot.example.com/login?sso_auth_token=b"),
    });
    const resolveChatwootPlatform = vi.fn(async (tenantId: string) =>
      tenantId === "tenant-a" ? tenantAPlatform : tenantBPlatform,
    );
    const useCase = createGetChatwootSsoUrlUseCase({
      userRepository: repositories.userRepository,
      resolveChatwootPlatform,
      logger: createFakeLogger(),
    });

    const resultA = await useCase.execute({
      userId: userTenantA.id,
      role: "agent",
      correlationId: "corr-a",
      tenantId: "tenant-a" as TenantId,
    });
    const resultB = await useCase.execute({
      userId: userTenantB.id,
      role: "agent",
      correlationId: "corr-b",
      tenantId: "tenant-b" as TenantId,
    });

    expect(resultA.ssoUrl).toContain("a.chatwoot.example.com");
    expect(resultB.ssoUrl).toContain("b.chatwoot.example.com");
    expect(tenantAPlatform.createSsoUrl).toHaveBeenCalledWith("111");
    expect(tenantBPlatform.createSsoUrl).toHaveBeenCalledWith("222");
    expect(resolveChatwootPlatform).toHaveBeenCalledWith("tenant-a");
    expect(resolveChatwootPlatform).toHaveBeenCalledWith("tenant-b");
  });
});
