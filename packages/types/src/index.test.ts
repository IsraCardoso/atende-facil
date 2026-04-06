import { describe, expect, it } from "vitest";

import { createCorrelationId, createEmail, createTenantId } from "./index";

describe("createTenantId", () => {
  it("should return a tenant id when value is valid", () => {
    expect(createTenantId("tenant-acme")).toBe("tenant-acme");
  });
});

describe("createCorrelationId", () => {
  it("should return a correlation id when value is valid", () => {
    expect(createCorrelationId("req-123")).toBe("req-123");
  });
});

describe("createEmail", () => {
  it("should normalize and return a valid email", () => {
    expect(createEmail("  ADMIN@ACME.COM ")).toBe("admin@acme.com");
  });

  it("should reject invalid email format", () => {
    expect(() => createEmail("admin.acme.com")).toThrowError("Email inválido: admin.acme.com.");
  });
});
