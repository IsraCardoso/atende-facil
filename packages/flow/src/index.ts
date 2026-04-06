export type FlowNode = Readonly<{
  id: string;
  nextNodeId: string | null;
}>;

export function getNextNodeId(node: FlowNode): string | null {
  return node.nextNodeId;
}
