/** Garante que todo template da galeria passa na validação estrutural do flow engine. */
import { validateFlowDefinition } from "flow";
import { describe, expect, it } from "vitest";

import { flowTemplates } from "./flow-templates";

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
});
