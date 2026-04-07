import { Handle, type NodeProps, Position } from "@xyflow/react";
import type { NodeData } from "../../../utils/flow-serializer";

export function OptionNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  const options = d.options ?? [];
  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-md min-w-[200px] ${selected ? "border-amber-500" : "border-amber-200"}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-400 !w-3 !h-3" />
      <div className="bg-amber-50 px-3 py-1.5 rounded-t-md border-b border-amber-100 flex items-center gap-2">
        <span className="text-sm">📋</span>
        <span className="text-xs font-semibold text-amber-700 uppercase">Opcoes</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-xs text-gray-500 mb-1">{d.prompt || "Sem prompt"}</p>
        <div className="space-y-1">
          {options.map((opt) => (
            <div key={opt.id} className="relative text-xs bg-amber-50 rounded px-2 py-1 pr-5">
              {opt.label || opt.id}
              <Handle
                type="source"
                position={Position.Right}
                id={`option-${opt.id}`}
                className="!bg-amber-400 !w-2.5 !h-2.5 !right-[-6px]"
              />
            </div>
          ))}
          {options.length === 0 && <p className="text-xs text-gray-400">Nenhuma opcao</p>}
        </div>
      </div>
    </div>
  );
}
