import { describe, expect, it } from "vitest";

import { getAuthModuleStatus } from "./index";

describe("getAuthModuleStatus", () => {
  it("should return not-configured in the sprint bootstrap phase", () => {
    expect(getAuthModuleStatus()).toBe("not-configured");
  });
});
