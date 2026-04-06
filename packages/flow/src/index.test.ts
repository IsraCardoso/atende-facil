import { describe, expect, it } from "vitest";

import { getNextNodeId } from "./index";

describe("getNextNodeId", () => {
  it("should return the configured next node id when present", () => {
    const result = getNextNodeId({
      id: "node-a",
      nextNodeId: "node-b",
    });

    expect(result).toBe("node-b");
  });

  it("should return null when there is no next node", () => {
    const result = getNextNodeId({
      id: "node-a",
      nextNodeId: null,
    });

    expect(result).toBeNull();
  });
});
