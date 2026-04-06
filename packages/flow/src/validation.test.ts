import { describe, expect, it } from "vitest";

import type { Flow } from "./types";
import { validateFlowDefinition } from "./validation";

function createValidFlow(): Flow {
  return {
    id: "flow-valid",
    tenantId: "tenant-01",
    startNodeId: "start",
    nodes: [
      {
        id: "start",
        type: "message",
        text: "Boas-vindas",
        nextNodeId: "menu",
      },
      {
        id: "menu",
        type: "option",
        prompt: "Escolha:",
        options: [
          {
            id: "opt-loop",
            label: "Voltar menu",
            aliases: ["menu"],
            nextNodeId: "loop-message",
          },
          {
            id: "opt-end",
            label: "Finalizar",
            aliases: ["fim"],
            nextNodeId: "end",
          },
        ],
      },
      {
        id: "loop-message",
        type: "message",
        text: "Retornando menu",
        nextNodeId: "menu",
      },
      {
        id: "end",
        type: "end",
        summaryMessage: "Fim",
      },
    ],
  };
}

function hasIssue(flow: Flow, code: string): boolean {
  return validateFlowDefinition(flow).issues.some((issue) => issue.code === code);
}

describe("validateFlowDefinition", () => {
  it("should validate flow with controlled interactive cycle and terminal escape", () => {
    const result = validateFlowDefinition(createValidFlow());

    expect(result.isValid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.terminalNodeIds).toContain("end");
  });

  it("should invalidate flow when start node does not exist", () => {
    const flow = createValidFlow();
    const invalidFlow: Flow = {
      ...flow,
      startNodeId: "missing-start",
    };

    const result = validateFlowDefinition(invalidFlow);

    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "START_NODE_NOT_FOUND")).toBe(true);
  });

  it("should invalidate flow when option destination does not exist", () => {
    const flow = createValidFlow();
    const invalidFlow: Flow = {
      ...flow,
      nodes: flow.nodes.map((node) =>
        node.id === "menu" && node.type === "option"
          ? {
              ...node,
              options: node.options.map((option) =>
                option.id === "opt-end"
                  ? {
                      ...option,
                      nextNodeId: "missing-end",
                    }
                  : option,
              ),
            }
          : node,
      ),
    };

    expect(hasIssue(invalidFlow, "DESTINATION_NODE_NOT_FOUND")).toBe(true);
  });

  it("should invalidate flow when input node is missing field key", () => {
    const flow = createValidFlow();
    const invalidFlow: Flow = {
      ...flow,
      nodes: [
        ...flow.nodes,
        {
          id: "collect",
          type: "input",
          prompt: "Seu nome?",
          fieldKey: "",
          nextNodeId: "end",
        },
      ],
    };

    expect(hasIssue(invalidFlow, "INPUT_FIELD_KEY_EMPTY")).toBe(true);
  });

  it("should invalidate flow with orphan node", () => {
    const flow = createValidFlow();
    const invalidFlow: Flow = {
      ...flow,
      nodes: [
        ...flow.nodes,
        {
          id: "orphan",
          type: "message",
          text: "no orfao",
          nextNodeId: null,
        },
      ],
    };

    const result = validateFlowDefinition(invalidFlow);

    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "ORPHAN_NODE")).toBe(true);
  });

  it("should invalidate automatic cycle without interaction", () => {
    const flow: Flow = {
      id: "flow-auto-cycle",
      tenantId: "tenant-01",
      startNodeId: "a",
      nodes: [
        {
          id: "a",
          type: "message",
          text: "A",
          nextNodeId: "b",
        },
        {
          id: "b",
          type: "message",
          text: "B",
          nextNodeId: "a",
        },
      ],
    };

    const result = validateFlowDefinition(flow);

    expect(result.isValid).toBe(false);
    expect(
      result.issues.some((issue) => issue.code === "AUTOMATIC_CYCLE_WITHOUT_INTERACTION"),
    ).toBe(true);
  });

  it("should invalidate interactive cycle when there is no terminal escape", () => {
    const flow: Flow = {
      id: "flow-interactive-cycle",
      tenantId: "tenant-01",
      startNodeId: "menu",
      nodes: [
        {
          id: "menu",
          type: "option",
          prompt: "Escolha",
          options: [
            {
              id: "opt-loop",
              label: "Loop",
              nextNodeId: "loop-message",
            },
          ],
        },
        {
          id: "loop-message",
          type: "message",
          text: "Voltando",
          nextNodeId: "menu",
        },
      ],
    };

    const result = validateFlowDefinition(flow);

    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "INTERACTIVE_CYCLE_WITHOUT_ESCAPE")).toBe(
      true,
    );
  });

  it("should invalidate ambiguous tokens in option matching", () => {
    const flow: Flow = {
      id: "flow-ambiguous-token",
      tenantId: "tenant-01",
      startNodeId: "menu",
      nodes: [
        {
          id: "menu",
          type: "option",
          prompt: "Escolha",
          options: [
            {
              id: "opt-1",
              label: "Financeiro",
              aliases: ["Suporte"],
              nextNodeId: "end",
            },
            {
              id: "opt-2",
              label: "Comercial",
              aliases: ["suporte"],
              nextNodeId: "end",
            },
          ],
        },
        {
          id: "end",
          type: "end",
        },
      ],
    };

    const result = validateFlowDefinition(flow);

    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "AMBIGUOUS_OPTION_TOKEN")).toBe(true);
  });
});
