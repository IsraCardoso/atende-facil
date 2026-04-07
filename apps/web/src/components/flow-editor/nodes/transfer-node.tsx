import { Handle, type NodeProps, Position } from "@xyflow/react";
import type { NodeData } from "../../../utils/flow-serializer";

export function TransferNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-md min-w-[160px] ${selected ? "border-purple-500" : "border-purple-200"}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-purple-400 !w-3 !h-3" />
      <div className="bg-purple-50 px-3 py-1.5 rounded-t-md border-b border-purple-100 flex items-center gap-2">
        <span className="text-sm">🔄</span>
        <span className="text-xs font-semibold text-purple-700 uppercase">Transferir</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm text-gray-700">{d.reason || d.message || "Transferir para humano"}</p>
      </div>
    </div>
  );
}
