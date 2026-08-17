/** Testes do rate limiter — valida bloqueio apos limite e contagem de requests (RN-025). */

import { describe, expect, it } from "vitest";

import {
  createInMemoryRateLimiter,
  RATE_LIMITS,
  resolveRateLimitCategory,
} from "./rate-limit-middleware";

describe("createInMemoryRateLimiter", () => {
  it("should allow requests within the limit", () => {
    const limiter = createInMemoryRateLimiter();
    const config = { windowMs: 60_000, maxRequests: 5 };

    for (let i = 0; i < 5; i++) {
      const result = limiter.check("key:1", config);
      expect(result.allowed).toBe(true);
    }
  });

  it("should block after exceeding the limit", () => {
    const limiter = createInMemoryRateLimiter();
    const config = { windowMs: 60_000, maxRequests: 5 };

    for (let i = 0; i < 5; i++) {
      limiter.check("key:2", config);
    }

    const blocked = limiter.check("key:2", config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("should not block different keys", () => {
    const limiter = createInMemoryRateLimiter();
    const config = { windowMs: 60_000, maxRequests: 5 };

    for (let i = 0; i < 5; i++) {
      limiter.check("key:a", config);
    }

    const result = limiter.check("key:b", config);
    expect(result.allowed).toBe(true);
  });

  it("should return retryAfterSeconds when blocked", () => {
    const limiter = createInMemoryRateLimiter();
    const config = { windowMs: 60_000, maxRequests: 1 };

    limiter.check("key:retry", config);
    const blocked = limiter.check("key:retry", config);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });
});

describe("resolveRateLimitCategory", () => {
  it("should return login for POST /auth/login", () => {
    expect(resolveRateLimitCategory("/auth/login", "POST")).toBe("login");
  });

  it("should return null for GET /auth/login", () => {
    expect(resolveRateLimitCategory("/auth/login", "GET")).toBeNull();
  });

  it("should return webhook for /webhook paths", () => {
    expect(resolveRateLimitCategory("/webhook/evolution", "POST")).toBe("webhook");
  });

  it("should return flow for /flows paths", () => {
    expect(resolveRateLimitCategory("/flows", "GET")).toBe("flow");
    expect(resolveRateLimitCategory("/flows/123", "PUT")).toBe("flow");
  });

  it("should return null for unmatched paths", () => {
    expect(resolveRateLimitCategory("/health", "GET")).toBeNull();
  });
});

describe("RATE_LIMITS", () => {
  it("should define login limit as 5/min", () => {
    expect(RATE_LIMITS.login).toEqual({ windowMs: 60_000, maxRequests: 5 });
  });

  it("should define webhook limit as 100/min", () => {
    expect(RATE_LIMITS.webhook).toEqual({ windowMs: 60_000, maxRequests: 100 });
  });

  it("should define flow limit as 30/min", () => {
    expect(RATE_LIMITS.flow).toEqual({ windowMs: 60_000, maxRequests: 30 });
  });
});
