type SessionMode = "bot" | "waiting_human" | "human_active";

type FlowNodeType = "message" | "option" | "input" | "transfer" | "end";

type FlowNodeId = string;

type FlowOption = Readonly<{
  id: string;
  label: string;
  nextNodeId: FlowNodeId;
  aliases?: readonly string[];
}>;

type BaseFlowNode<TType extends FlowNodeType> = Readonly<{
  id: FlowNodeId;
  type: TType;
}>;

type MessageNode = BaseFlowNode<"message"> &
  Readonly<{
    text: string;
    nextNodeId: FlowNodeId | null;
  }>;

type OptionNode = BaseFlowNode<"option"> &
  Readonly<{
    prompt: string;
    options: readonly FlowOption[];
    invalidResponseMessage?: string;
  }>;

type InputNode = BaseFlowNode<"input"> &
  Readonly<{
    prompt: string;
    fieldKey: string;
    nextNodeId: FlowNodeId;
    emptyResponseMessage?: string;
  }>;

type TransferNode = BaseFlowNode<"transfer"> &
  Readonly<{
    reason?: string;
    message?: string;
  }>;

type EndNode = BaseFlowNode<"end"> &
  Readonly<{
    summaryMessage?: string;
  }>;

type FlowNode = MessageNode | OptionNode | InputNode | TransferNode | EndNode;

type Edge = Readonly<{
  fromNodeId: FlowNodeId;
  toNodeId: FlowNodeId;
  reason: string;
}>;

type Flow = Readonly<{
  id: string;
  tenantId: string;
  startNodeId: FlowNodeId;
  nodes: readonly FlowNode[];
  edges?: readonly Edge[];
}>;

type Session = Readonly<{
  tenantId: string;
  phone: string;
  currentNodeId: FlowNodeId | null;
  mode: SessionMode;
  data: Readonly<Record<string, unknown>>;
}>;

type FlowEvent = Readonly<{
  type: "SessionTransferredToHuman" | "SessionFlowCompleted";
  flowId: string;
  tenantId: string;
  phone: string;
  nodeId: FlowNodeId;
  sequence: number;
  context: Readonly<Record<string, unknown>>;
}>;

type ProcessDebug = Readonly<{
  visitedNodeIds: readonly FlowNodeId[];
  transitionCount: number;
  consumedIncomingMessage: boolean;
  matchedOptionId: string | null;
  collectedFieldKey: string | null;
  warnings: readonly string[];
}>;

type ProcessAction =
  | Readonly<{
      kind: "awaiting_user_input";
      nodeId: FlowNodeId;
      nodeType: "option" | "input";
    }>
  | Readonly<{
      kind: "transferred_to_human";
      nodeId: FlowNodeId;
      reason: string | null;
    }>
  | Readonly<{
      kind: "flow_completed";
      nodeId: FlowNodeId;
    }>
  | Readonly<{
      kind: "ignored_non_bot_mode";
      mode: Exclude<SessionMode, "bot">;
    }>
  | Readonly<{
      kind: "invalid_flow_state";
      issueCode: string;
      message: string;
    }>;

type ProcessResult = Readonly<{
  session: Session;
  outgoingMessages: readonly string[];
  action: ProcessAction;
  events: readonly FlowEvent[];
  debug: ProcessDebug;
}>;

function assertNever(value: never, context: string): never {
  throw new Error(`Unhandled value in ${context}: ${JSON.stringify(value)}`);
}

function isInteractiveNode(node: FlowNode): node is OptionNode | InputNode {
  return node.type === "option" || node.type === "input";
}

function isTerminalNode(node: FlowNode): node is TransferNode | EndNode {
  return node.type === "transfer" || node.type === "end";
}

function getOutgoingNodeIds(node: FlowNode): readonly FlowNodeId[] {
  switch (node.type) {
    case "message":
      return node.nextNodeId ? [node.nextNodeId] : [];
    case "option":
      return node.options.map((option) => option.nextNodeId);
    case "input":
      return [node.nextNodeId];
    case "transfer":
    case "end":
      return [];
    default:
      return assertNever(node, "getOutgoingNodeIds");
  }
}

function createNodeIndex(nodes: readonly FlowNode[]): ReadonlyMap<FlowNodeId, FlowNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

export type {
  Edge,
  EndNode,
  Flow,
  FlowEvent,
  FlowNode,
  FlowNodeId,
  FlowNodeType,
  FlowOption,
  InputNode,
  MessageNode,
  OptionNode,
  ProcessAction,
  ProcessDebug,
  ProcessResult,
  Session,
  SessionMode,
  TransferNode,
};
export { assertNever, createNodeIndex, getOutgoingNodeIds, isInteractiveNode, isTerminalNode };
