/** Pagina de listagem de flows com CRUD e acoes de lifecycle (RN-020). */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppShell } from "../components/app-shell";
import { useAuth } from "../hooks/use-auth";
import { createFlowApi, type FlowDto } from "../services/flow-api";

const FALLBACK_BADGE = { bg: "bg-gray-100", text: "text-gray-700", label: "Rascunho" } as const;

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  draft: FALLBACK_BADGE,
  published: { bg: "bg-blue-100", text: "text-blue-700", label: "Publicado" },
  active: { bg: "bg-green-100", text: "text-green-700", label: "Ativo" },
  archived: { bg: "bg-red-100", text: "text-red-700", label: "Arquivado" },
};

type FlowAction = "publish" | "activate" | "deactivate" | "archive" | "delete";

export function FlowsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const api = useMemo(() => createFlowApi(() => token), [token]);

  const [flows, setFlows] = useState<readonly FlowDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const createInputRef = useRef<HTMLInputElement>(null);

  const loadFlows = useCallback(async () => {
    setLoading(true);
    const res = await api.listFlows(statusFilter ? { status: statusFilter } : {});
    if (res.ok) {
      setFlows(res.data.data);
    }
    setLoading(false);
  }, [statusFilter, api]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  useEffect(() => {
    if (showCreateDialog) {
      createInputRef.current?.focus();
    }
  }, [showCreateDialog]);

  const handleCreateSubmit = async () => {
    if (!newFlowName.trim()) {
      return;
    }
    const res = await api.createFlow(newFlowName.trim());
    setShowCreateDialog(false);
    setNewFlowName("");
    if (res.ok) {
      navigate(`/flows/${res.data.flow.id}/edit`);
    }
  };

  const handleAction = async (flowId: string, action: FlowAction) => {
    switch (action) {
      case "publish":
        await api.publishFlow(flowId);
        break;
      case "activate":
        await api.activateFlow(flowId);
        break;
      case "deactivate":
        await api.deactivateFlow(flowId);
        break;
      case "archive":
        await api.archiveFlow(flowId);
        break;
      case "delete":
        await api.deleteFlow(flowId);
        break;
      default:
        break;
    }
    loadFlows();
  };

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Fluxos</h1>
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
          >
            + Novo Flow
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {["", "draft", "published", "active", "archived"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs rounded-full border ${statusFilter === s ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
            >
              {s ? STATUS_BADGES[s]?.label : "Todos"}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-500 text-center py-8">Carregando...</p>}

        {!loading && flows.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-gray-500 mb-2">Nenhum flow encontrado</p>
            <button
              type="button"
              onClick={() => setShowCreateDialog(true)}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              Criar primeiro flow
            </button>
          </div>
        )}

        {!loading && flows.length > 0 && (
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                    Nome
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                    Versao
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                    Atualizado
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {flows.map((flow) => {
                  const badge = STATUS_BADGES[flow.status] ?? FALLBACK_BADGE;
                  return (
                    <tr key={flow.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/flows/${flow.id}/edit`)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {flow.name}
                        </button>
                        {flow.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{flow.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">v{flow.version}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(flow.updatedAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          {flow.status === "draft" && (
                            <ActionButton
                              label="Publicar"
                              onClick={() => handleAction(flow.id, "publish")}
                              color="blue"
                            />
                          )}
                          {flow.status === "published" && (
                            <ActionButton
                              label="Ativar"
                              onClick={() => handleAction(flow.id, "activate")}
                              color="green"
                            />
                          )}
                          {flow.status === "active" && (
                            <ActionButton
                              label="Desativar"
                              onClick={() => handleAction(flow.id, "deactivate")}
                              color="amber"
                            />
                          )}
                          {flow.status !== "archived" && (
                            <ActionButton
                              label="Arquivar"
                              onClick={() => handleAction(flow.id, "archive")}
                              color="red"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showCreateDialog && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-96">
              <h2 className="text-lg font-semibold mb-4">Novo Flow</h2>
              <label htmlFor="new-flow-name" className="block text-sm text-gray-600 mb-1">
                Nome do flow
              </label>
              <input
                ref={createInputRef}
                id="new-flow-name"
                type="text"
                value={newFlowName}
                onChange={(e) => setNewFlowName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateSubmit();
                  }
                }}
                placeholder="Meu fluxo de atendimento"
                className="w-full border rounded px-3 py-2 text-sm mb-4 focus:ring-1 focus:ring-blue-400"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewFlowName("");
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateSubmit}
                  disabled={!newFlowName.trim()}
                  className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Criar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ActionButton({
  label,
  onClick,
  color,
}: {
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded bg-${color}-100 text-${color}-700 hover:bg-${color}-200`}
    >
      {label}
    </button>
  );
}
