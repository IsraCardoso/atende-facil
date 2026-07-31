/** Validação estática de definições de fluxo. Detecta nós órfãos, edges inválidos e ciclos antes da ativação. */
import {
  createNodeIndex,
  type Flow,
  type FlowNode,
  getOutgoingNodeIds,
  isInteractiveNode,
  isTerminalNode,
} from "./types";

type FlowValidationSeverity = "error" | "warning";

type FlowValidationCode =
  | "FLOW_WITHOUT_NODES"
  | "FLOW_WITHOUT_TERMINAL_NODE"
  | "START_NODE_NOT_FOUND"
  | "NODE_ID_EMPTY"
  | "DUPLICATE_NODE_ID"
  | "MESSAGE_TEXT_EMPTY"
  | "OPTION_PROMPT_EMPTY"
  | "OPTION_WITHOUT_CHOICES"
  | "OPTION_ID_EMPTY"
  | "OPTION_LABEL_EMPTY"
  | "OPTION_DESTINATION_EMPTY"
  | "AMBIGUOUS_OPTION_TOKEN"
  | "INPUT_PROMPT_EMPTY"
  | "INPUT_FIELD_KEY_EMPTY"
  | "INPUT_DESTINATION_EMPTY"
  | "DESTINATION_NODE_ID_EMPTY"
  | "DESTINATION_NODE_NOT_FOUND"
  | "ORPHAN_NODE"
  | "NODE_WITHOUT_TERMINAL_PATH"
  | "AUTOMATIC_CYCLE_WITHOUT_INTERACTION"
  | "INTERACTIVE_CYCLE_WITHOUT_ESCAPE";

type FlowValidationIssue = Readonly<{
  code: FlowValidationCode;
  severity: FlowValidationSeverity;
  message: string;
  nodeId?: string;
  details?: Readonly<Record<string, unknown>>;
}>;

type FlowValidationResult = Readonly<{
  isValid: boolean;
  issues: readonly FlowValidationIssue[];
  reachableNodeIds: readonly string[];
  terminalNodeIds: readonly string[];
}>;

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

function createIssue(
  input: Readonly<{
    code: FlowValidationCode;
    severity: FlowValidationSeverity;
    message: string;
    nodeId?: string;
    details?: Readonly<Record<string, unknown>>;
  }>,
): FlowValidationIssue {
  return {
    code: input.code,
    severity: input.severity,
    message: input.message,
    ...(input.nodeId !== undefined ? { nodeId: input.nodeId } : {}),
    ...(input.details !== undefined ? { details: input.details } : {}),
  };
}

function collectReachableNodeIds(
  startNodeId: string,
  outgoingByNodeId: ReadonlyMap<string, readonly string[]>,
): ReadonlySet<string> {
  const visited = new Set<string>();
  const queue: string[] = [startNodeId];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const targetNodeId of outgoingByNodeId.get(current) ?? []) {
      if (!visited.has(targetNodeId)) {
        queue.push(targetNodeId);
      }
    }
  }

  return visited;
}

function collectTerminalReachableNodeIds(
  terminalNodeIds: readonly string[],
  incomingByNodeId: ReadonlyMap<string, readonly string[]>,
): ReadonlySet<string> {
  const reachable = new Set<string>();
  const queue = [...terminalNodeIds];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || reachable.has(current)) {
      continue;
    }

    reachable.add(current);

    for (const sourceNodeId of incomingByNodeId.get(current) ?? []) {
      if (!reachable.has(sourceNodeId)) {
        queue.push(sourceNodeId);
      }
    }
  }

  return reachable;
}

function listStronglyConnectedComponents(
  nodeIds: readonly string[],
  outgoingByNodeId: ReadonlyMap<string, readonly string[]>,
): readonly (readonly string[])[] {
  const indexByNodeId = new Map<string, number>();
  const lowLinkByNodeId = new Map<string, number>();
  const stack: string[] = [];
  const stackSet = new Set<string>();
  const components: string[][] = [];
  let indexCounter = 0;

  function strongConnect(nodeId: string): void {
    indexByNodeId.set(nodeId, indexCounter);
    lowLinkByNodeId.set(nodeId, indexCounter);
    indexCounter += 1;
    stack.push(nodeId);
    stackSet.add(nodeId);

    for (const targetNodeId of outgoingByNodeId.get(nodeId) ?? []) {
      if (!indexByNodeId.has(targetNodeId)) {
        strongConnect(targetNodeId);
        const lowLink = lowLinkByNodeId.get(nodeId);
        const targetLowLink = lowLinkByNodeId.get(targetNodeId);

        if (lowLink !== undefined && targetLowLink !== undefined && targetLowLink < lowLink) {
          lowLinkByNodeId.set(nodeId, targetLowLink);
        }
      } else if (stackSet.has(targetNodeId)) {
        const lowLink = lowLinkByNodeId.get(nodeId);
        const targetIndex = indexByNodeId.get(targetNodeId);

        if (lowLink !== undefined && targetIndex !== undefined && targetIndex < lowLink) {
          lowLinkByNodeId.set(nodeId, targetIndex);
        }
      }
    }

    const lowLink = lowLinkByNodeId.get(nodeId);
    const nodeIndex = indexByNodeId.get(nodeId);

    if (lowLink === undefined || nodeIndex === undefined || lowLink !== nodeIndex) {
      return;
    }

    const component: string[] = [];
    while (stack.length > 0) {
      const popped = stack.pop();

      if (!popped) {
        break;
      }

      stackSet.delete(popped);
      component.push(popped);

      if (popped === nodeId) {
        break;
      }
    }

    components.push(component);
  }

  for (const nodeId of nodeIds) {
    if (!indexByNodeId.has(nodeId)) {
      strongConnect(nodeId);
    }
  }

  return components;
}

function validateNodeDefinition(
  node: FlowNode,
  issues: FlowValidationIssue[],
): readonly FlowValidationIssue[] {
  if (!hasText(node.id)) {
    issues.push(
      createIssue({
        code: "NODE_ID_EMPTY",
        severity: "error",
        nodeId: node.id,
        message: "Este nó está sem identificador. Todo nó precisa de um nome único.",
      }),
    );
  }

  if (node.type === "message" && !hasText(node.text)) {
    issues.push(
      createIssue({
        code: "MESSAGE_TEXT_EMPTY",
        severity: "error",
        nodeId: node.id,
        message: "Este nó de mensagem está sem texto. Escreva o que o cliente vai receber.",
      }),
    );
  }

  if (node.type === "option") {
    if (!hasText(node.prompt)) {
      issues.push(
        createIssue({
          code: "OPTION_PROMPT_EMPTY",
          severity: "error",
          nodeId: node.id,
          message: "Este nó de opções está sem a pergunta que será exibida ao cliente.",
        }),
      );
    }

    if (node.options.length === 0) {
      issues.push(
        createIssue({
          code: "OPTION_WITHOUT_CHOICES",
          severity: "error",
          nodeId: node.id,
          message:
            "Este nó de opções não tem nenhuma alternativa cadastrada. Adicione pelo menos uma.",
        }),
      );
    }

    const optionTokens = new Set<string>();
    for (const option of node.options) {
      if (!hasText(option.id)) {
        issues.push(
          createIssue({
            code: "OPTION_ID_EMPTY",
            severity: "error",
            nodeId: node.id,
            message: "Uma das alternativas deste nó está sem identificador.",
          }),
        );
      }

      if (!hasText(option.label)) {
        issues.push(
          createIssue({
            code: "OPTION_LABEL_EMPTY",
            severity: "error",
            nodeId: node.id,
            message: "Uma das alternativas deste nó está sem o texto que o cliente vai ver.",
          }),
        );
      }

      if (!hasText(option.nextNodeId)) {
        issues.push(
          createIssue({
            code: "OPTION_DESTINATION_EMPTY",
            severity: "error",
            nodeId: node.id,
            message: "Uma das alternativas deste nó não está conectada a nenhum próximo passo.",
          }),
        );
      }

      const aliasTokens = option.aliases ?? [];
      const allTokens = [option.id, option.label, ...aliasTokens];
      for (const token of allTokens) {
        if (!hasText(token)) {
          continue;
        }

        const normalizedToken = normalizeToken(token);
        if (optionTokens.has(normalizedToken)) {
          issues.push(
            createIssue({
              code: "AMBIGUOUS_OPTION_TOKEN",
              severity: "warning",
              nodeId: node.id,
              message:
                "Duas alternativas deste nó usam o mesmo texto ou atalho — o cliente pode não conseguir escolher entre elas com clareza.",
              details: {
                token: normalizedToken,
              },
            }),
          );
          continue;
        }

        optionTokens.add(normalizedToken);
      }
    }
  }

  if (node.type === "input") {
    if (!hasText(node.prompt)) {
      issues.push(
        createIssue({
          code: "INPUT_PROMPT_EMPTY",
          severity: "error",
          nodeId: node.id,
          message: "Este nó de coleta de dado está sem a pergunta que será exibida ao cliente.",
        }),
      );
    }

    if (!hasText(node.fieldKey)) {
      issues.push(
        createIssue({
          code: "INPUT_FIELD_KEY_EMPTY",
          severity: "error",
          nodeId: node.id,
          message:
            "Este nó de coleta de dado não definiu onde a resposta do cliente será guardada.",
        }),
      );
    }

    if (!hasText(node.nextNodeId)) {
      issues.push(
        createIssue({
          code: "INPUT_DESTINATION_EMPTY",
          severity: "error",
          nodeId: node.id,
          message: "Este nó de coleta de dado não está conectado a nenhum próximo passo.",
        }),
      );
    }
  }

  return issues;
}

function createOutgoingMap(
  nodeIndex: ReadonlyMap<string, FlowNode>,
): ReadonlyMap<string, readonly string[]> {
  const outgoingEntries = [...nodeIndex.values()].map(
    (node) => [node.id, getOutgoingNodeIds(node)] as const,
  );
  return new Map(outgoingEntries);
}

function createIncomingMap(
  nodeIds: readonly string[],
  outgoingByNodeId: ReadonlyMap<string, readonly string[]>,
): ReadonlyMap<string, readonly string[]> {
  const incomingByNodeId = new Map<string, string[]>();
  for (const nodeId of nodeIds) {
    incomingByNodeId.set(nodeId, []);
  }

  for (const sourceNodeId of nodeIds) {
    for (const targetNodeId of outgoingByNodeId.get(sourceNodeId) ?? []) {
      const incoming = incomingByNodeId.get(targetNodeId);
      if (!incoming) {
        continue;
      }

      incoming.push(sourceNodeId);
    }
  }

  return incomingByNodeId;
}

export function validateFlowDefinition(flow: Flow): FlowValidationResult {
  const issues: FlowValidationIssue[] = [];

  if (flow.nodes.length === 0) {
    return {
      isValid: false,
      issues: [
        createIssue({
          code: "FLOW_WITHOUT_NODES",
          severity: "error",
          message: "O fluxo precisa ter pelo menos um nó.",
        }),
      ],
      reachableNodeIds: [],
      terminalNodeIds: [],
    };
  }

  const mutableNodeIndex = new Map<string, FlowNode>();
  for (const node of flow.nodes) {
    validateNodeDefinition(node, issues);

    if (mutableNodeIndex.has(node.id)) {
      issues.push(
        createIssue({
          code: "DUPLICATE_NODE_ID",
          severity: "error",
          nodeId: node.id,
          message: "Dois nós estão usando o mesmo identificador. Cada nó precisa de um nome único.",
        }),
      );
      continue;
    }

    mutableNodeIndex.set(node.id, node);
  }

  const nodeIndex = createNodeIndex([...mutableNodeIndex.values()]);
  const nodeIds = [...nodeIndex.keys()];
  const outgoingByNodeId = createOutgoingMap(nodeIndex);
  const incomingByNodeId = createIncomingMap(nodeIds, outgoingByNodeId);

  if (!nodeIndex.has(flow.startNodeId)) {
    issues.push(
      createIssue({
        code: "START_NODE_NOT_FOUND",
        severity: "error",
        message: "O nó inicial do fluxo não existe. Escolha um nó válido para começar a conversa.",
        details: {
          startNodeId: flow.startNodeId,
        },
      }),
    );
  }

  for (const node of nodeIndex.values()) {
    for (const targetNodeId of getOutgoingNodeIds(node)) {
      if (!hasText(targetNodeId)) {
        issues.push(
          createIssue({
            code: "DESTINATION_NODE_ID_EMPTY",
            severity: "error",
            nodeId: node.id,
            message: "Este nó tem uma conexão sem destino definido.",
          }),
        );
        continue;
      }

      if (!nodeIndex.has(targetNodeId)) {
        issues.push(
          createIssue({
            code: "DESTINATION_NODE_NOT_FOUND",
            severity: "error",
            nodeId: node.id,
            message: "Este nó está conectado a um destino que não existe mais.",
            details: {
              destinationNodeId: targetNodeId,
            },
          }),
        );
      }
    }
  }

  const reachableNodeIds = nodeIndex.has(flow.startNodeId)
    ? collectReachableNodeIds(flow.startNodeId, outgoingByNodeId)
    : new Set<string>();

  for (const nodeId of nodeIds) {
    if (!reachableNodeIds.has(nodeId)) {
      issues.push(
        createIssue({
          code: "ORPHAN_NODE",
          severity: "warning",
          nodeId,
          message:
            "Este nó nunca será alcançado a partir do início do fluxo — nenhum caminho leva até ele.",
        }),
      );
    }
  }

  const terminalNodeIds = [...nodeIndex.values()]
    .filter((node) => isTerminalNode(node))
    .map((node) => node.id);

  if (terminalNodeIds.length === 0) {
    issues.push(
      createIssue({
        code: "FLOW_WITHOUT_TERMINAL_NODE",
        severity: "error",
        message:
          "O fluxo precisa terminar em algum ponto — adicione um nó de transferência para atendente ou de encerramento.",
      }),
    );
  }

  const terminalReachableNodeIds = collectTerminalReachableNodeIds(
    terminalNodeIds,
    incomingByNodeId,
  );
  for (const nodeId of reachableNodeIds) {
    if (!terminalReachableNodeIds.has(nodeId)) {
      issues.push(
        createIssue({
          code: "NODE_WITHOUT_TERMINAL_PATH",
          severity: "error",
          nodeId,
          message:
            "A partir deste nó, a conversa não tem como chegar a um encerramento ou transferência para atendente.",
        }),
      );
    }
  }

  const components = listStronglyConnectedComponents(nodeIds, outgoingByNodeId);
  for (const component of components) {
    if (component.length === 0) {
      continue;
    }

    const firstNodeId = component[0];
    if (!firstNodeId) {
      continue;
    }

    const hasSelfLoop = (outgoingByNodeId.get(firstNodeId) ?? []).includes(firstNodeId);
    const isCycle = component.length > 1 || hasSelfLoop;
    if (!isCycle) {
      continue;
    }

    const componentNodeSet = new Set(component);
    const componentNodes = component
      .map((nodeId) => nodeIndex.get(nodeId))
      .filter((node): node is FlowNode => node !== undefined);

    const isAutomaticCycle = componentNodes.every((node) => node.type === "message");
    if (isAutomaticCycle) {
      issues.push(
        createIssue({
          code: "AUTOMATIC_CYCLE_WITHOUT_INTERACTION",
          severity: "error",
          nodeId: firstNodeId,
          message:
            "Estes nós formam um loop automático sem nenhuma pergunta ao cliente — a conversa ficaria presa se repetindo para sempre.",
          details: {
            componentNodeIds: component,
          },
        }),
      );
      continue;
    }

    const hasInteractiveNode = componentNodes.some((node) => isInteractiveNode(node));
    const hasEscapeToTerminal = component.some((nodeId) =>
      (outgoingByNodeId.get(nodeId) ?? []).some(
        (targetNodeId) =>
          !componentNodeSet.has(targetNodeId) && terminalReachableNodeIds.has(targetNodeId),
      ),
    );

    if (hasInteractiveNode && !hasEscapeToTerminal) {
      issues.push(
        createIssue({
          code: "INTERACTIVE_CYCLE_WITHOUT_ESCAPE",
          severity: "warning",
          nodeId: firstNodeId,
          message:
            "Estes nós formam um loop e não há como sair dele para encerrar ou transferir a conversa.",
          details: {
            componentNodeIds: component,
          },
        }),
      );
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    reachableNodeIds: [...reachableNodeIds],
    terminalNodeIds,
  };
}

export type {
  FlowValidationCode,
  FlowValidationIssue,
  FlowValidationResult,
  FlowValidationSeverity,
};
