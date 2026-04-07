import type { NodeTypes } from "@xyflow/react";

import { EndNode } from "./end-node";
import { InputNode } from "./input-node";
import { MessageNode } from "./message-node";
import { OptionNode } from "./option-node";
import { TransferNode } from "./transfer-node";

export const nodeTypes: NodeTypes = {
  message: MessageNode,
  option: OptionNode,
  input: InputNode,
  transfer: TransferNode,
  end: EndNode,
};
