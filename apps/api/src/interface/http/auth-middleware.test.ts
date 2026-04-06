import { describe, expect, it, vi } from "vitest";
import { isAppError } from "../../application/errors/app-error";
import type { VerifyAccessTokenUseCase } from "../../application/use-cases";
import { createTenantId, createUserId } from "../../domain";
import { authenticateRequest, extractBearerToken } from "./auth-middleware";

describe("auth-middleware", () => {
  it("should extract bearer token from authorization header", () => {
    const request = new Request("http://localhost/auth/me", {
      headers: {
        authorization: "Bearer token-123",
      },
    });

    const token = extractBearerToken(request);

    expect(token).toBe("token-123");
  });

  it("should reject request when authorization header is missing", () => {
    const request = new Request("http://localhost/auth/me");

    try {
      extractBearerToken(request);
      throw new Error("Expected AUTH_UNAUTHORIZED");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("AUTH_UNAUTHORIZED");
      }
    }
  });

  it("should reject request when authorization header is malformed", () => {
    const request = new Request("http://localhost/auth/me", {
      headers: {
        authorization: "Token token-123",
      },
    });

    try {
      extractBearerToken(request);
      throw new Error("Expected AUTH_UNAUTHORIZED");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("AUTH_UNAUTHORIZED");
      }
    }
  });

  it("should authenticate request by delegating token verification", async () => {
    const verifySpy = vi.fn(async (token: string) => ({
      sub: createUserId("user-auth"),
      tenantId: createTenantId("tenant-auth"),
      role: "admin" as const,
      iat: 1712400000,
      exp: 1712403600,
      token,
    }));
    const verifyAccessTokenUseCase: VerifyAccessTokenUseCase = {
      execute: verifySpy,
    };
    const request = new Request("http://localhost/auth/me", {
      headers: {
        authorization: "Bearer token-valid",
      },
    });

    const claims = await authenticateRequest(request, verifyAccessTokenUseCase);

    expect(verifySpy).toHaveBeenCalledWith("token-valid");
    expect(claims.tenantId).toBe(createTenantId("tenant-auth"));
    expect(claims.sub).toBe(createUserId("user-auth"));
  });
});
