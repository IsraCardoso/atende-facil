import { describe, expect, it } from "vitest";

describe("App", () => {
  it("should export App component", async () => {
    const mod = await import("./main");
    expect(mod.App).toBeDefined();
    expect(typeof mod.App).toBe("function");
  });
});
