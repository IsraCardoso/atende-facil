import { Handle, type NodeProps, Position } from "@xyflow/react";
import type { NodeData } from "../../../utils/flow-serializer";

export function InputNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-md min-w-[180px] ${selected ? "border-green-500" : "border-green-200"}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-400 !w-3 !h-3" />
      <div className="bg-green-50 px-3 py-1.5 rounded-t-md border-b border-green-100 flex items-center gap-2">
        <span className="text-sm">✏️</span>
        <span className="text-xs font-semibold text-green-700 uppercase">Entrada</span>
      </div>
      <div className="px-3 py-2 space-y-1">
        <p className="text-sm text-gray-700">{d.prompt || "Sem prompt"}</p>
        <p className="text-xs text-gray-400">Campo: {d.fieldKey || "—"}</p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="next"
        className="!bg-green-400 !w-3 !h-3"
      />
    </div>
  );
}
