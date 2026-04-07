import { Handle, type NodeProps, Position } from "@xyflow/react";
import type { NodeData } from "../../../utils/flow-serializer";

export function EndNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-md min-w-[140px] ${selected ? "border-red-500" : "border-red-200"}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-red-400 !w-3 !h-3" />
      <div className="bg-red-50 px-3 py-1.5 rounded-t-md border-b border-red-100 flex items-center gap-2">
        <span className="text-sm">🏁</span>
        <span className="text-xs font-semibold text-red-700 uppercase">Fim</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm text-gray-700">{d.summaryMessage || "Fim do fluxo"}</p>
      </div>
    </div>
  );
}
