/** Sidebar de edicao de propriedades do no selecionado (RN-022). */

import type { Node } from "@xyflow/react";
import { useCallback } from "react";
import type { NodeData } from "../../utils/flow-serializer";

type Props = {
  node: Node<NodeData>;
  onUpdate: (id: string, data: Partial<NodeData>) => void;
  onClose: () => void;
};

export function NodePropertyPanel({ node, onUpdate, onClose }: Props) {
  const data = node.data;
  const nodeType = data.nodeType;

  const handleChange = useCallback(
    (field: string, value: unknown) => {
      onUpdate(node.id, { [field]: value });
    },
    [node.id, onUpdate],
  );

  return (
    <div className="w-72 border-l border-gray-200 bg-white p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-gray-800">Propriedades</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          &times;
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="prop-node-id" className="block text-xs font-medium text-gray-500 mb-1">
            ID do no
          </label>
          <input
            id="prop-node-id"
            type="text"
            value={node.id}
            disabled={true}
            className="w-full text-xs bg-gray-50 border rounded px-2 py-1.5 text-gray-500"
          />
        </div>

        <div>
          <label htmlFor="prop-node-type" className="block text-xs font-medium text-gray-500 mb-1">
            Tipo
          </label>
          <input
            id="prop-node-type"
            type="text"
            value={nodeType}
            disabled={true}
            className="w-full text-xs bg-gray-50 border rounded px-2 py-1.5 text-gray-500 capitalize"
          />
        </div>

        {nodeType === "message" && (
          <div>
            <label htmlFor="prop-msg-text" className="block text-xs font-medium text-gray-500 mb-1">
              Texto
            </label>
            <textarea
              id="prop-msg-text"
              value={data.text ?? ""}
              onChange={(e) => handleChange("text", e.target.value)}
              rows={3}
              className="w-full text-sm border rounded px-2 py-1.5 resize-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
            />
          </div>
        )}

        {nodeType === "option" && (
          <>
            <div>
              <label
                htmlFor="prop-opt-prompt"
                className="block text-xs font-medium text-gray-500 mb-1"
              >
                Prompt
              </label>
              <textarea
                id="prop-opt-prompt"
                value={data.prompt ?? ""}
                onChange={(e) => handleChange("prompt", e.target.value)}
                rows={2}
                className="w-full text-sm border rounded px-2 py-1.5 resize-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <OptionListEditor
              options={data.options ?? []}
              onChange={(opts) => handleChange("options", opts)}
            />
          </>
        )}

        {nodeType === "input" && (
          <>
            <div>
              <label
                htmlFor="prop-input-prompt"
                className="block text-xs font-medium text-gray-500 mb-1"
              >
                Prompt
              </label>
              <textarea
                id="prop-input-prompt"
                value={data.prompt ?? ""}
                onChange={(e) => handleChange("prompt", e.target.value)}
                rows={2}
                className="w-full text-sm border rounded px-2 py-1.5 resize-none focus:ring-1 focus:ring-green-400"
              />
            </div>
            <div>
              <label
                htmlFor="prop-field-key"
                className="block text-xs font-medium text-gray-500 mb-1"
              >
                Campo (fieldKey)
              </label>
              <input
                id="prop-field-key"
                type="text"
                value={data.fieldKey ?? ""}
                onChange={(e) => handleChange("fieldKey", e.target.value)}
                className="w-full text-sm border rounded px-2 py-1.5 focus:ring-1 focus:ring-green-400"
              />
            </div>
          </>
        )}

        {nodeType === "transfer" && (
          <>
            <div>
              <label
                htmlFor="prop-transfer-reason"
                className="block text-xs font-medium text-gray-500 mb-1"
              >
                Motivo
              </label>
              <input
                id="prop-transfer-reason"
                type="text"
                value={data.reason ?? ""}
                onChange={(e) => handleChange("reason", e.target.value)}
                className="w-full text-sm border rounded px-2 py-1.5 focus:ring-1 focus:ring-purple-400"
              />
            </div>
            <div>
              <label
                htmlFor="prop-transfer-msg"
                className="block text-xs font-medium text-gray-500 mb-1"
              >
                Mensagem
              </label>
              <textarea
                id="prop-transfer-msg"
                value={data.message ?? ""}
                onChange={(e) => handleChange("message", e.target.value)}
                rows={2}
                className="w-full text-sm border rounded px-2 py-1.5 resize-none focus:ring-1 focus:ring-purple-400"
              />
            </div>
          </>
        )}

        {nodeType === "end" && (
          <div>
            <label
              htmlFor="prop-end-summary"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              Mensagem de resumo
            </label>
            <textarea
              id="prop-end-summary"
              value={data.summaryMessage ?? ""}
              onChange={(e) => handleChange("summaryMessage", e.target.value)}
              rows={2}
              className="w-full text-sm border rounded px-2 py-1.5 resize-none focus:ring-1 focus:ring-red-400"
            />
          </div>
        )}
      </div>
    </div>
  );
}

type OptionListEditorProps = {
  options: NodeData["options"];
  onChange: (options: NodeData["options"]) => void;
};

function OptionListEditor({ options = [], onChange }: OptionListEditorProps) {
  const addOption = () => {
    const id = `opt-${Date.now()}`;
    onChange([...options, { id, label: "", nextNodeId: "" }]);
  };

  const updateOption = (index: number, field: string, value: string) => {
    const updated = options.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt));
    onChange(updated);
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500">Opcoes</span>
        <button
          type="button"
          onClick={addOption}
          className="text-xs text-amber-600 hover:text-amber-800"
        >
          + Adicionar
        </button>
      </div>
      <div className="space-y-2">
        {options.map((opt, idx) => (
          <div key={opt.id} className="bg-gray-50 rounded p-2 space-y-1">
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={opt.label}
                onChange={(e) => updateOption(idx, "label", e.target.value)}
                placeholder="Label"
                className="flex-1 text-xs border rounded px-1.5 py-1"
              />
              <button
                type="button"
                onClick={() => removeOption(idx)}
                className="text-red-400 hover:text-red-600 text-xs px-1"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
