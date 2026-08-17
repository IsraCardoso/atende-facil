import { describe, expect, it } from "vitest";

import { cn } from "./index";

describe("cn", () => {
  it("should merge tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
