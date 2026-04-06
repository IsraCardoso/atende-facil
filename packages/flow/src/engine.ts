import {
  createNodeIndex,
  type Flow,
  type FlowEvent,
  type FlowOption,
  type ProcessResult,
  type Session,
} from "./types";

const DEFAULT_INVALID_OPTION_MESSAGE = "Opcao invalida. Escolha uma alternativa valida.";
const DEFAULT_EMPTY_INPUT_MESSAGE = "Entrada invalida. Informe um valor nao vazio.";
const RUNTIME_LOOP_GUARD_LIMIT = 100;

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

function createFlowEvent(
  input: Readonly<{
    type: FlowEvent["type"];
    flow: Flow;
    session: Session;
    nodeId: string;
    sequence: number;
    context?: Readonly<Record<string, unknown>>;
  }>,
): FlowEvent {
  return {
    type: input.type,
    flowId: input.flow.id,
    tenantId: input.session.tenantId,
    phone: input.session.phone,
    nodeId: input.nodeId,
    sequence: input.sequence,
    context: input.context ?? {},
  };
}

function resolveOptionSelection(
  options: readonly FlowOption[],
  message: string,
): FlowOption | null {
  const normalizedMessage = normalizeToken(message);

  if (normalizedMessage.length === 0) {
    return null;
  }

  if (/^\d+$/.test(normalizedMessage)) {
    const parsedIndex = Number.parseInt(normalizedMessage, 10);
    const option = options[parsedIndex - 1];
    return option ?? null;
  }

  for (const option of options) {
    const candidates = [option.id, option.label, ...(option.aliases ?? [])];
    const hasMatch = candidates.some(
      (candidate) => normalizeToken(candidate) === normalizedMessage,
    );

    if (hasMatch) {
      return option;
    }
  }

  return null;
}

function createInvalidStateResult(
  input: Readonly<{
    session: Session;
    message: string;
    issueCode: string;
    issueMessage: string;
    visitedNodeIds: readonly string[];
    transitionCount: number;
    consumedIncomingMessage: boolean;
    matchedOptionId: string | null;
    collectedFieldKey: string | null;
    warnings?: readonly string[];
  }>,
): ProcessResult {
  return {
    session: input.session,
    outgoingMessages: [],
    action: {
      kind: "invalid_flow_state",
      issueCode: input.issueCode,
      message: input.issueMessage,
    },
    events: [],
    debug: {
      visitedNodeIds: input.visitedNodeIds,
      transitionCount: input.transitionCount,
      consumedIncomingMessage: input.consumedIncomingMessage,
      matchedOptionId: input.matchedOptionId,
      collectedFieldKey: input.collectedFieldKey,
      warnings: input.warnings ?? [],
    },
  };
}

function cloneSessionData(data: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return { ...data };
}

export function processMessage(session: Session, message: string, flow: Flow): ProcessResult {
  if (session.mode !== "bot") {
    return {
      session,
      outgoingMessages: [],
      action: {
        kind: "ignored_non_bot_mode",
        mode: session.mode,
      },
      events: [],
      debug: {
        visitedNodeIds: [],
        transitionCount: 0,
        consumedIncomingMessage: false,
        matchedOptionId: null,
        collectedFieldKey: null,
        warnings: [],
      },
    };
  }

  const nodeIndex = createNodeIndex(flow.nodes);
  const startNodeId = session.currentNodeId ?? flow.startNodeId;

  if (!nodeIndex.has(startNodeId)) {
    return createInvalidStateResult({
      session,
      message,
      issueCode: "MISSING_CURRENT_NODE",
      issueMessage: "Sessao aponta para no inexistente no fluxo.",
      visitedNodeIds: [],
      transitionCount: 0,
      consumedIncomingMessage: false,
      matchedOptionId: null,
      collectedFieldKey: null,
    });
  }

  const mutableData = cloneSessionData(session.data);
  const visitedNodeIds: string[] = [];
  const outgoingMessages: string[] = [];
  const warnings: string[] = [];
  let transitionCount = 0;
  let currentNodeId: string | null = startNodeId;
  let canConsumeInteractiveInput = session.currentNodeId !== null;
  let consumedIncomingMessage = false;
  let matchedOptionId: string | null = null;
  let collectedFieldKey: string | null = null;

  while (currentNodeId) {
    const currentNode = nodeIndex.get(currentNodeId);
    if (!currentNode) {
      return createInvalidStateResult({
        session,
        message,
        issueCode: "NODE_NOT_FOUND_DURING_EXECUTION",
        issueMessage: "Fluxo invalido em runtime: no de processamento nao encontrado.",
        visitedNodeIds,
        transitionCount,
        consumedIncomingMessage,
        matchedOptionId,
        collectedFieldKey,
        warnings,
      });
    }

    transitionCount += 1;
    if (transitionCount > RUNTIME_LOOP_GUARD_LIMIT) {
      warnings.push("Loop automatico detectado durante o processamento.");
      return createInvalidStateResult({
        session: {
          ...session,
          currentNodeId: currentNode.id,
          data: mutableData,
        },
        message,
        issueCode: "RUNTIME_LOOP_GUARD_TRIGGERED",
        issueMessage: "Fluxo interrompido por protecao de loop automatico.",
        visitedNodeIds,
        transitionCount,
        consumedIncomingMessage,
        matchedOptionId,
        collectedFieldKey,
        warnings,
      });
    }

    visitedNodeIds.push(currentNode.id);

    if (currentNode.type === "message") {
      outgoingMessages.push(currentNode.text);
      currentNodeId = currentNode.nextNodeId;
      canConsumeInteractiveInput = false;
      continue;
    }

    if (currentNode.type === "option") {
      if (!canConsumeInteractiveInput) {
        outgoingMessages.push(currentNode.prompt);
        return {
          session: {
            ...session,
            currentNodeId: currentNode.id,
            data: mutableData,
          },
          outgoingMessages,
          action: {
            kind: "awaiting_user_input",
            nodeId: currentNode.id,
            nodeType: "option",
          },
          events: [],
          debug: {
            visitedNodeIds,
            transitionCount,
            consumedIncomingMessage,
            matchedOptionId,
            collectedFieldKey,
            warnings,
          },
        };
      }

      const selectedOption = resolveOptionSelection(currentNode.options, message);
      if (!selectedOption) {
        outgoingMessages.push(currentNode.invalidResponseMessage ?? DEFAULT_INVALID_OPTION_MESSAGE);
        outgoingMessages.push(currentNode.prompt);
        return {
          session: {
            ...session,
            currentNodeId: currentNode.id,
            data: mutableData,
          },
          outgoingMessages,
          action: {
            kind: "awaiting_user_input",
            nodeId: currentNode.id,
            nodeType: "option",
          },
          events: [],
          debug: {
            visitedNodeIds,
            transitionCount,
            consumedIncomingMessage: false,
            matchedOptionId: null,
            collectedFieldKey,
            warnings,
          },
        };
      }

      consumedIncomingMessage = true;
      matchedOptionId = selectedOption.id;
      currentNodeId = selectedOption.nextNodeId;
      canConsumeInteractiveInput = false;
      continue;
    }

    if (currentNode.type === "input") {
      if (!canConsumeInteractiveInput) {
        outgoingMessages.push(currentNode.prompt);
        return {
          session: {
            ...session,
            currentNodeId: currentNode.id,
            data: mutableData,
          },
          outgoingMessages,
          action: {
            kind: "awaiting_user_input",
            nodeId: currentNode.id,
            nodeType: "input",
          },
          events: [],
          debug: {
            visitedNodeIds,
            transitionCount,
            consumedIncomingMessage,
            matchedOptionId,
            collectedFieldKey,
            warnings,
          },
        };
      }

      const normalizedMessage = message.trim();
      if (normalizedMessage.length === 0) {
        outgoingMessages.push(currentNode.emptyResponseMessage ?? DEFAULT_EMPTY_INPUT_MESSAGE);
        outgoingMessages.push(currentNode.prompt);
        return {
          session: {
            ...session,
            currentNodeId: currentNode.id,
            data: mutableData,
          },
          outgoingMessages,
          action: {
            kind: "awaiting_user_input",
            nodeId: currentNode.id,
            nodeType: "input",
          },
          events: [],
          debug: {
            visitedNodeIds,
            transitionCount,
            consumedIncomingMessage: false,
            matchedOptionId,
            collectedFieldKey: null,
            warnings,
          },
        };
      }

      consumedIncomingMessage = true;
      collectedFieldKey = currentNode.fieldKey;
      mutableData[currentNode.fieldKey] = normalizedMessage;
      currentNodeId = currentNode.nextNodeId;
      canConsumeInteractiveInput = false;
      continue;
    }

    if (currentNode.type === "transfer") {
      if (currentNode.message !== undefined) {
        outgoingMessages.push(currentNode.message);
      }

      const nextSession: Session = {
        ...session,
        currentNodeId: currentNode.id,
        mode: "waiting_human",
        data: mutableData,
      };
      const event = createFlowEvent({
        type: "SessionTransferredToHuman",
        flow,
        session: nextSession,
        nodeId: currentNode.id,
        sequence: transitionCount,
        ...(currentNode.reason !== undefined ? { context: { reason: currentNode.reason } } : {}),
      });

      return {
        session: nextSession,
        outgoingMessages,
        action: {
          kind: "transferred_to_human",
          nodeId: currentNode.id,
          reason: currentNode.reason ?? null,
        },
        events: [event],
        debug: {
          visitedNodeIds,
          transitionCount,
          consumedIncomingMessage,
          matchedOptionId,
          collectedFieldKey,
          warnings,
        },
      };
    }

    if (currentNode.summaryMessage !== undefined) {
      outgoingMessages.push(currentNode.summaryMessage);
    }

    const nextSession: Session = {
      ...session,
      currentNodeId: null,
      mode: "bot",
      data: mutableData,
    };
    const event = createFlowEvent({
      type: "SessionFlowCompleted",
      flow,
      session: nextSession,
      nodeId: currentNode.id,
      sequence: transitionCount,
      context: {
        visitedNodeCount: visitedNodeIds.length,
      },
    });

    return {
      session: nextSession,
      outgoingMessages,
      action: {
        kind: "flow_completed",
        nodeId: currentNode.id,
      },
      events: [event],
      debug: {
        visitedNodeIds,
        transitionCount,
        consumedIncomingMessage,
        matchedOptionId,
        collectedFieldKey,
        warnings,
      },
    };
  }

  return {
    session: {
      ...session,
      currentNodeId: null,
      mode: "bot",
      data: mutableData,
    },
    outgoingMessages,
    action: {
      kind: "flow_completed",
      nodeId: visitedNodeIds.at(-1) ?? flow.startNodeId,
    },
    events: [
      createFlowEvent({
        type: "SessionFlowCompleted",
        flow,
        session,
        nodeId: visitedNodeIds.at(-1) ?? flow.startNodeId,
        sequence: transitionCount,
        context: {
          endedWithoutTerminalNode: true,
        },
      }),
    ],
    debug: {
      visitedNodeIds,
      transitionCount,
      consumedIncomingMessage,
      matchedOptionId,
      collectedFieldKey,
      warnings,
    },
  };
}

export { RUNTIME_LOOP_GUARD_LIMIT };
