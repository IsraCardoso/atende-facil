import { describe, expect, it } from "vitest";

import { isAppError } from "../errors/app-error";
import { createRbacPolicyService } from "./rbac-policy";

describe("createRbacPolicyService", () => {
  it("should allow admin to create users", () => {
    const service = createRbacPolicyService();

    expect(service.isAllowed("admin", "auth.users.create")).toBe(true);
    expect(() => service.assertAllowed("admin", "auth.users.create")).not.toThrow();
  });

  it("should block manager on create users permission", () => {
    const service = createRbacPolicyService();

    expect(service.isAllowed("manager", "auth.users.create")).toBe(false);

    try {
      service.assertAllowed("manager", "auth.users.create");
      throw new Error("Expected forbidden error");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("AUTH_FORBIDDEN");
      }
    }
  });
});
