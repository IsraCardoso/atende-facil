import { describe, expect, it } from "vitest";

import { createWorkerBootstrapMessage } from "./index";

describe("createWorkerBootstrapMessage", () => {
  it("should return bootstrap message", () => {
    expect(createWorkerBootstrapMessage()).toBe("worker bootstrap ready");
  });
});
