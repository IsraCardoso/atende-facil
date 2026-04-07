/** Paleta de nos para drag-and-drop no canvas (RN-022). */
import type { DragEvent } from "react";

const NODE_ITEMS = [
  { type: "message", label: "Mensagem", icon: "💬", color: "blue" },
  { type: "option", label: "Opcoes", icon: "📋", color: "amber" },
  { type: "input", label: "Entrada", icon: "✏️", color: "green" },
  { type: "transfer", label: "Transferir", icon: "🔄", color: "purple" },
  { type: "end", label: "Fim", icon: "🏁", color: "red" },
] as const;

function onDragStart(event: DragEvent, nodeType: string) {
  event.dataTransfer.setData("application/reactflow", nodeType);
  event.dataTransfer.effectAllowed = "move";
}

export function NodePalette() {
  return (
    <div className="p-3 space-y-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Nos</h3>
      {NODE_ITEMS.map((item) => (
        <div
          key={item.type}
          role="button"
          tabIndex={0}
          draggable={true}
          onDragStart={(e) => onDragStart(e, item.type)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-${item.color}-200 bg-${item.color}-50 cursor-grab hover:shadow-md transition-shadow text-sm`}
        >
          <span>{item.icon}</span>
          <span className={`font-medium text-${item.color}-700`}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
