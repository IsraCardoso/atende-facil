/** Tipos de dominio para flows. Entidade com ciclo de vida, branded type FlowId e validacao de transicoes (RN-020). */
type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

type FlowId = Brand<string, "FlowId">;

type FlowStatus = "draft" | "published" | "active" | "archived";

type FlowEntity = Readonly<{
  id: FlowId;
  tenantId: string;
  name: string;
  description: string | null;
  definition: Readonly<Record<string, unknown>>;
  status: FlowStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}>;

const validFlowTransitions: Readonly<Record<FlowStatus, readonly FlowStatus[]>> = {
  draft: ["published", "archived"],
  published: ["active", "draft", "archived"],
  active: ["published", "archived"],
  archived: [],
};

function isValidFlowTransition(from: FlowStatus, to: FlowStatus): boolean {
  return validFlowTransitions[from].includes(to);
}

/**
 * Constroi um FlowId branded a partir de string bruta.
 * @throws {Error} Quando o valor fica vazio apos trim.
 */
function createFlowId(rawValue: string): FlowId {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    throw new Error("FlowId invalido: valor vazio.");
  }

  return trimmed as FlowId;
}

export type { FlowEntity, FlowId, FlowStatus };
export { createFlowId, isValidFlowTransition, validFlowTransitions };
