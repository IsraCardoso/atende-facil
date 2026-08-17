import { Handle, type NodeProps, Position } from "@xyflow/react";
import type { NodeData } from "../../../utils/flow-serializer";

export function MessageNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-md min-w-[180px] ${selected ? "border-blue-500" : "border-blue-200"}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-400 !w-3 !h-3" />
      <div className="bg-blue-50 px-3 py-1.5 rounded-t-md border-b border-blue-100 flex items-center gap-2">
        <span className="text-sm">💬</span>
        <span className="text-xs font-semibold text-blue-700 uppercase">Mensagem</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm text-gray-700 line-clamp-3">{d.text || "Sem texto"}</p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="next"
        className="!bg-blue-400 !w-3 !h-3"
      />
    </div>
  );
}
