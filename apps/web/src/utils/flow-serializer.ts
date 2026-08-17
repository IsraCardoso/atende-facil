/** Serializacao bidirecional React Flow <-> JSON backend. Preserva posicoes e dados (RN-022). */
import type { Node, Edge as RFEdge } from "@xyflow/react";

type BackendNode = Readonly<{
  id: string;
  type: "message" | "option" | "input" | "transfer" | "end";
  text?: string;
  nextNodeId?: string | null;
  prompt?: string;
  options?: readonly {
    id: string;
    label: string;
    nextNodeId: string;
    aliases?: readonly string[];
  }[];
  invalidResponseMessage?: string;
  fieldKey?: string;
  emptyResponseMessage?: string;
  reason?: string;
  message?: string;
  summaryMessage?: string;
}>;

type BackendDefinition = {
  id?: string;
  tenantId?: string;
  startNodeId: string;
  nodes: BackendNode[];
  edges?: { fromNodeId: string; toNodeId: string; reason: string }[];
  positions?: Record<string, { x: number; y: number }>;
};

type NodeData = {
  label: string;
  nodeType: string;
  text?: string;
  nextNodeId?: string | null;
  prompt?: string;
  options?: { id: string; label: string; nextNodeId: string; aliases?: readonly string[] }[];
  invalidResponseMessage?: string;
  fieldKey?: string;
  emptyResponseMessage?: string;
  reason?: string;
  message?: string;
  summaryMessage?: string;
  [key: string]: unknown;
};

const NODE_TYPE_LABELS: Record<string, string> = {
  message: "Mensagem",
  option: "Opcoes",
  input: "Entrada",
  transfer: "Transferir",
  end: "Fim",
};

const DEFAULT_SPACING = { x: 250, y: 150 };

export function backendToReactFlow(definition: Record<string, unknown>): {
  nodes: Node<NodeData>[];
  edges: RFEdge[];
  startNodeId: string;
} {
  const def = definition as unknown as BackendDefinition;
  const backendNodes = def.nodes ?? [];
  const positions = (def.positions ?? {}) as Record<string, { x: number; y: number }>;
  const startNodeId = def.startNodeId ?? "";

  const nodes: Node<NodeData>[] = backendNodes.map((bn, index) => {
    const pos = positions[bn.id] ?? {
      x: (index % 4) * DEFAULT_SPACING.x,
      y: Math.floor(index / 4) * DEFAULT_SPACING.y,
    };

    const data: NodeData = {
      label: NODE_TYPE_LABELS[bn.type] ?? bn.type,
      nodeType: bn.type,
    };
    if (bn.text !== undefined) {
      data.text = bn.text;
    }
    if (bn.nextNodeId !== undefined) {
      data.nextNodeId = bn.nextNodeId;
    }
    if (bn.prompt !== undefined) {
      data.prompt = bn.prompt;
    }
    if (bn.options !== undefined) {
      data.options = bn.options.map((o) => ({ ...o }));
    }
    if (bn.invalidResponseMessage !== undefined) {
      data.invalidResponseMessage = bn.invalidResponseMessage;
    }
    if (bn.fieldKey !== undefined) {
      data.fieldKey = bn.fieldKey;
    }
    if (bn.emptyResponseMessage !== undefined) {
      data.emptyResponseMessage = bn.emptyResponseMessage;
    }
    if (bn.reason !== undefined) {
      data.reason = bn.reason;
    }
    if (bn.message !== undefined) {
      data.message = bn.message;
    }
    if (bn.summaryMessage !== undefined) {
      data.summaryMessage = bn.summaryMessage;
    }

    return { id: bn.id, type: bn.type, position: pos, data };
  });

  const edges: RFEdge[] = [];

  for (const bn of backendNodes) {
    if (bn.type === "message" && bn.nextNodeId) {
      edges.push({
        id: `${bn.id}->${bn.nextNodeId}`,
        source: bn.id,
        target: bn.nextNodeId,
        sourceHandle: "next",
      });
    }
    if (bn.type === "input" && bn.nextNodeId) {
      edges.push({
        id: `${bn.id}->${bn.nextNodeId}`,
        source: bn.id,
        target: bn.nextNodeId,
        sourceHandle: "next",
      });
    }
    if (bn.type === "option" && bn.options) {
      for (const opt of bn.options) {
        if (opt.nextNodeId) {
          edges.push({
            id: `${bn.id}-opt-${opt.id}->${opt.nextNodeId}`,
            source: bn.id,
            target: opt.nextNodeId,
            sourceHandle: `option-${opt.id}`,
            label: opt.label,
          });
        }
      }
    }
  }

  return { nodes, edges, startNodeId };
}

export function reactFlowToBackend(
  nodes: Node<NodeData>[],
  edges: RFEdge[],
  startNodeId: string,
  flowId?: string,
  tenantId?: string,
): Record<string, unknown> {
  const positions: Record<string, { x: number; y: number }> = {};
  const edgesBySource = new Map<string, RFEdge[]>();

  for (const edge of edges) {
    const list = edgesBySource.get(edge.source) ?? [];
    list.push(edge);
    edgesBySource.set(edge.source, list);
  }

  const backendNodes: BackendNode[] = nodes.map((node) => {
    positions[node.id] = { x: node.position.x, y: node.position.y };
    const sourceEdges = edgesBySource.get(node.id) ?? [];
    const data = node.data;

    switch (data.nodeType) {
      case "message": {
        const nextEdge = sourceEdges.find((e) => e.sourceHandle === "next");
        return {
          id: node.id,
          type: "message" as const,
          text: data.text ?? "",
          nextNodeId: nextEdge?.target ?? null,
        };
      }
      case "option": {
        const options = (data.options ?? []).map((opt) => {
          const optEdge = sourceEdges.find((e) => e.sourceHandle === `option-${opt.id}`);
          return {
            id: opt.id,
            label: opt.label,
            nextNodeId: optEdge?.target ?? opt.nextNodeId ?? "",
            ...(opt.aliases?.length ? { aliases: opt.aliases } : {}),
          };
        });
        return {
          id: node.id,
          type: "option" as const,
          prompt: data.prompt ?? "",
          options,
          ...(data.invalidResponseMessage
            ? { invalidResponseMessage: data.invalidResponseMessage }
            : {}),
        };
      }
      case "input": {
        const nextEdge = sourceEdges.find((e) => e.sourceHandle === "next");
        return {
          id: node.id,
          type: "input" as const,
          prompt: data.prompt ?? "",
          fieldKey: data.fieldKey ?? "",
          nextNodeId: nextEdge?.target ?? "",
          ...(data.emptyResponseMessage ? { emptyResponseMessage: data.emptyResponseMessage } : {}),
        };
      }
      case "transfer":
        return {
          id: node.id,
          type: "transfer" as const,
          ...(data.reason ? { reason: data.reason } : {}),
          ...(data.message ? { message: data.message } : {}),
        };
      case "end":
        return {
          id: node.id,
          type: "end" as const,
          ...(data.summaryMessage ? { summaryMessage: data.summaryMessage } : {}),
        };
      default:
        return { id: node.id, type: "message" as const, text: "" };
    }
  });

  return {
    ...(flowId ? { id: flowId } : {}),
    ...(tenantId ? { tenantId } : {}),
    startNodeId,
    nodes: backendNodes,
    positions,
  };
}

export type { BackendDefinition, BackendNode, NodeData };
