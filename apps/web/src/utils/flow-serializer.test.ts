/** Testes de serializacao bidirecional React Flow <-> backend. */
import { describe, expect, it } from "vitest";

import { backendToReactFlow, reactFlowToBackend } from "./flow-serializer";

const sampleBackendDefinition = {
  startNodeId: "start",
  nodes: [
    { id: "start", type: "message", text: "Bem-vindo!", nextNodeId: "opts" },
    {
      id: "opts",
      type: "option",
      prompt: "Escolha:",
      options: [
        { id: "1", label: "Suporte", nextNodeId: "transfer" },
        { id: "2", label: "Sair", nextNodeId: "end" },
      ],
    },
    { id: "transfer", type: "transfer", reason: "Suporte humano" },
    { id: "end", type: "end", summaryMessage: "Ate logo!" },
  ],
  positions: {
    start: { x: 0, y: 0 },
    opts: { x: 0, y: 150 },
    transfer: { x: -150, y: 300 },
    end: { x: 150, y: 300 },
  },
};

describe("flow-serializer", () => {
  it("should convert backend to react flow format", () => {
    const result = backendToReactFlow(sampleBackendDefinition as Record<string, unknown>);

    expect(result.nodes).toHaveLength(4);
    expect(result.startNodeId).toBe("start");
    expect(result.edges.length).toBeGreaterThan(0);

    const startNode = result.nodes.find((n) => n.id === "start");
    expect(startNode?.type).toBe("message");
    expect(startNode?.data.text).toBe("Bem-vindo!");
    expect(startNode?.position).toEqual({ x: 0, y: 0 });
  });

  it("should convert react flow back to backend format", () => {
    const { nodes, edges, startNodeId } = backendToReactFlow(
      sampleBackendDefinition as Record<string, unknown>,
    );
    const result = reactFlowToBackend(nodes, edges, startNodeId);

    const backendNodes = result.nodes as { id: string; type: string }[];
    expect(backendNodes).toHaveLength(4);
    expect(result.startNodeId).toBe("start");

    const startNode = backendNodes.find((n) => n.id === "start");
    expect(startNode?.type).toBe("message");
  });

  it("should preserve positions in roundtrip", () => {
    const { nodes, edges, startNodeId } = backendToReactFlow(
      sampleBackendDefinition as Record<string, unknown>,
    );
    const result = reactFlowToBackend(nodes, edges, startNodeId);
    const positions = result.positions as Record<string, { x: number; y: number }>;

    expect(positions.start).toEqual({ x: 0, y: 0 });
    expect(positions.opts).toEqual({ x: 0, y: 150 });
  });

  it("should handle empty definition", () => {
    const result = backendToReactFlow({ startNodeId: "", nodes: [] });

    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});
