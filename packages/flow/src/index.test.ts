import { describe, expect, it } from "vitest";

import { processMessage, validateFlowDefinition } from "./index";

describe("flow public exports", () => {
  it("should expose validateFlowDefinition from package index", () => {
    const result = validateFlowDefinition({
      id: "flow-index",
      tenantId: "tenant-01",
      startNodeId: "end",
      nodes: [
        {
          id: "end",
          type: "end",
        },
      ],
    });

    expect(result.isValid).toBe(true);
  });

  it("should expose processMessage from package index", () => {
    const result = processMessage(
      {
        tenantId: "tenant-01",
        phone: "5511999999999",
        currentNodeId: null,
        mode: "bot",
        data: {},
      },
      "oi",
      {
        id: "flow-process-index",
        tenantId: "tenant-01",
        startNodeId: "welcome",
        nodes: [
          {
            id: "welcome",
            type: "message",
            text: "Boas-vindas",
            nextNodeId: "end",
          },
          {
            id: "end",
            type: "end",
          },
        ],
      },
    );

    expect(result.action).toEqual({
      kind: "flow_completed",
      nodeId: "end",
    });
  });
});
