/** Garante que todo template da galeria passa na validação estrutural do flow engine. */
import { validateFlowDefinition } from "flow";
import { describe, expect, it } from "vitest";

import { flowTemplates } from "./flow-templates";

// Percorre a partir de startNodeId seguindo nextNodeId (direto ou por option.nextNodeId) e retorna os ids visitados.
function collectReachableNodeIds(nodes: readonly Record<string, unknown>[], startNodeId: string) {
  const byId = new Map(nodes.map((node) => [String(node.id), node]));
  const visited = new Set<string>();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    const node = byId.get(currentId);
    if (!node) {
      continue;
    }

    if (typeof node.nextNodeId === "string") {
      queue.push(node.nextNodeId);
    }

    if (Array.isArray(node.options)) {
      for (const option of node.options as readonly Record<string, unknown>[]) {
        if (typeof option.nextNodeId === "string") {
          queue.push(option.nextNodeId);
        }
      }
    }
  }

  return visited;
}

describe("flowTemplates", () => {
  it.each(
    flowTemplates.map((template) => [template.name, template] as const),
  )("%s should be a structurally valid flow", (_name, template) => {
    const validation = validateFlowDefinition({
      id: "template-check",
      tenantId: "template-check",
      startNodeId: template.definition.startNodeId,
      nodes: template.definition.nodes as never,
    });

    expect(validation.isValid).toBe(true);
    expect(validation.issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  });

  it.each(
    flowTemplates.map((template) => [template.name, template] as const),
  )("%s should have every node reachable from startNodeId", (_name, template) => {
    const allNodeIds = template.definition.nodes.map((node) => String(node.id));
    const reachable = collectReachableNodeIds(
      template.definition.nodes,
      template.definition.startNodeId,
    );

    const unreachable = allNodeIds.filter((id) => !reachable.has(id));
    expect(unreachable).toEqual([]);
  });
});
