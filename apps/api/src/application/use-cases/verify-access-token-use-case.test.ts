/** Testes do VerifyAccessTokenUseCase — cenarios: token valido, token vazio, token invalido/expirado. */
import { describe, expect, it, vi } from "vitest";
import type { TenantId, UserId } from "../../domain/auth-types";
import type { JwtTokenClaims } from "../../domain/ports/auth-ports";
import { createVerifyAccessTokenUseCase } from "./verify-access-token-use-case";

const validClaims: JwtTokenClaims = {
  sub: "user-1" as UserId,
  tenantId: "tenant-1" as TenantId,
  role: "admin",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

function createDeps(overrides?: { verifyResult?: JwtTokenClaims; verifyError?: Error }) {
  const authTokenPort = {
    issue: vi.fn(),
    verify: overrides?.verifyError
      ? vi.fn().mockRejectedValue(overrides.verifyError)
      : vi.fn().mockResolvedValue(overrides?.verifyResult ?? validClaims),
  };
  return { authTokenPort };
}

describe("VerifyAccessTokenUseCase", () => {
  it("should return claims for a valid token", async () => {
    const deps = createDeps();
    const useCase = createVerifyAccessTokenUseCase(deps);

    const result = await useCase.execute("valid-jwt-token");

    expect(result).toEqual(validClaims);
    expect(deps.authTokenPort.verify).toHaveBeenCalledWith("valid-jwt-token");
  });

  it("should throw AUTH_UNAUTHORIZED when token is invalid or expired", async () => {
    const deps = createDeps({ verifyError: new Error("jwt expired") });
    const useCase = createVerifyAccessTokenUseCase(deps);

    await expect(useCase.execute("expired-token")).rejects.toMatchObject({
      code: "AUTH_UNAUTHORIZED",
    });
  });

  it("should throw when token is empty", async () => {
    const deps = createDeps();
    const useCase = createVerifyAccessTokenUseCase(deps);

    await expect(useCase.execute("  ")).rejects.toThrow(
      "Authorization token invalido: valor vazio",
    );
  });
});
