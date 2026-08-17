import { describe, expect, it } from "vitest";

import {
  createEmailAddress,
  createMembershipStatus,
  createTenantSlug,
  createUserRole,
} from "./auth-types";

describe("auth-types", () => {
  it("should normalize email address to lowercase", () => {
    const email = createEmailAddress("  ADMIN@ACME.COM ");

    expect(email).toBe("admin@acme.com");
  });

  it("should reject invalid email address", () => {
    expect(() => createEmailAddress("admin.acme.com")).toThrowError(
      "Email invalido: admin.acme.com.",
    );
  });

  it("should normalize slug and allow kebab-case", () => {
    const slug = createTenantSlug(" Acme-Med ");

    expect(slug).toBe("acme-med");
  });

  it("should reject invalid slug", () => {
    expect(() => createTenantSlug("acme med")).toThrowError(
      "TenantSlug invalido: acme med. Use apenas letras, numeros e hifen.",
    );
  });

  it("should create valid user role and membership status", () => {
    expect(createUserRole("admin")).toBe("admin");
    expect(createMembershipStatus("active")).toBe("active");
  });

  it("should reject invalid user role and membership status", () => {
    expect(() => createUserRole("owner")).toThrowError("UserRole invalido: owner.");
    expect(() => createMembershipStatus("deleted")).toThrowError(
      "MembershipStatus invalido: deleted.",
    );
  });
});
