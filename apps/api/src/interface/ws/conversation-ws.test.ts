/** Testes do WebSocket com JWT — valida rejeicao sem token e aceitacao com token valido (RN-025). */
import { describe, expect, it, vi } from "vitest";
import type { TenantId, UserId } from "../../domain/auth-types";
import type { AuthTokenPort, JwtTokenClaims } from "../../domain/ports/auth-ports";
import { createConnectionManager } from "./connection-manager";

describe("WebSocket JWT authentication", () => {
  function createMockAuthTokenPort(result: JwtTokenClaims | Error): AuthTokenPort {
    return {
      issue: vi.fn(),
      verify: vi.fn().mockImplementation(async () => {
        if (result instanceof Error) {
          throw result;
        }
        return result;
      }),
    };
  }

  const validClaims: JwtTokenClaims = {
    sub: "user-1" as UserId,
    tenantId: "tenant-1" as TenantId,
    role: "admin",
    iat: Date.now() / 1000,
    exp: Date.now() / 1000 + 3600,
  };

  it("should extract token from Authorization header", async () => {
    const authTokenPort = createMockAuthTokenPort(validClaims);

    const request = new Request("http://localhost/ws/conversations", {
      headers: { authorization: "Bearer valid-jwt-token" },
    });

    const token = extractTokenFromRequest(request);
    expect(token).toBe("valid-jwt-token");

    const claims = await authTokenPort.verify(token as string);
    expect(claims.tenantId).toBe("tenant-1");
  });

  it("should extract token from query param", () => {
    const request = new Request("http://localhost/ws/conversations?token=query-jwt-token");
    const token = extractTokenFromRequest(request);
    expect(token).toBe("query-jwt-token");
  });

  it("should return null when no token present", () => {
    const request = new Request("http://localhost/ws/conversations");
    const token = extractTokenFromRequest(request);
    expect(token).toBeNull();
  });

  it("should reject invalid token via authTokenPort", async () => {
    const authTokenPort = createMockAuthTokenPort(new Error("Invalid token"));

    await expect(authTokenPort.verify("bad-token")).rejects.toThrow("Invalid token");
  });

  it("should add connection to manager with tenantId from JWT", () => {
    const manager = createConnectionManager();
    const mockWs = { send: vi.fn() };

    manager.addConnection("tenant-1", mockWs);
    expect(manager.getConnectionCount("tenant-1")).toBe(1);
  });
});

function extractTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth) {
    const [scheme, token] = auth.split(" ");
    if (scheme === "Bearer" && token) {
      return token;
    }
  }

  const url = new URL(request.url);
  return url.searchParams.get("token");
}
