/** Editor visual de fluxos com React Flow, save, validacao, undo/redo e simulacao (RN-022, RN-023). */

import {
  addEdge,
  Background,
  type Connection,
  Controls,
  MiniMap,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  type Edge as RFEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { ArrowLeft } from "lucide-react";
import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@xyflow/react/dist/style.css";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { FlowEditorLayout } from "../components/flow-editor/flow-editor-layout";
import { NodePalette } from "../components/flow-editor/node-palette";
import { NodePropertyPanel } from "../components/flow-editor/node-property-panel";
import { nodeTypes } from "../components/flow-editor/nodes";
import { SimulationPanel } from "../components/flow-editor/simulation-panel";
import { useAuth } from "../hooks/use-auth";
import { useFlowSimulation } from "../hooks/use-flow-simulation";
import { createFlowApi } from "../services/flow-api";
import { backendToReactFlow, type NodeData, reactFlowToBackend } from "../utils/flow-serializer";

const AUTOSAVE_KEY = "atende-facil-flow-autosave";
const AUTOSAVE_DELAY = 2000;

type UndoEntry = { nodes: Node<NodeData>[]; edges: RFEdge[] };

function FlowEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const api = useMemo(() => createFlowApi(() => token), [token]);
  const reactFlowInstance = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  const [startNodeId, setStartNodeId] = useState("");
  const [flowName, setFlowName] = useState("Carregando...");
  const [flowId, setFlowId] = useState(id ?? "");
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);

  const undoStack = useRef<UndoEntry[]>([]);
  const redoStack = useRef<UndoEntry[]>([]);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const simulation = useFlowSimulation();

  const pushUndo = useCallback(() => {
    undoStack.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    redoStack.current = [];
    if (undoStack.current.length > 50) {
      undoStack.current.shift();
    }
  }, [nodes, edges]);

  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) {
      return;
    }
    redoStack.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    setNodes(entry.nodes);
    setEdges(entry.edges);
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) {
      return;
    }
    undoStack.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    setNodes(entry.nodes);
    setEdges(entry.edges);
  }, [nodes, edges, setNodes, setEdges]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  useEffect(() => {
    if (!id) {
      return;
    }
    const savedRaw = localStorage.getItem(`${AUTOSAVE_KEY}-${id}`);
    if (savedRaw) {
      try {
        const saved = JSON.parse(savedRaw) as {
          nodes: Node<NodeData>[];
          edges: RFEdge[];
          startNodeId: string;
          name: string;
        };
        setNodes(saved.nodes);
        setEdges(saved.edges);
        setStartNodeId(saved.startNodeId);
        setFlowName(saved.name ?? "Flow");
        setFlowId(id);
        setHasUnsavedChanges(true);
        return;
      } catch {
        /* fallback to API */
      }
    }

    api.getFlow(id).then((res) => {
      if (!res.ok) {
        navigate("/flows");
        return;
      }
      const { nodes: n, edges: e, startNodeId: s } = backendToReactFlow(res.data.definition);
      setNodes(n);
      setEdges(e);
      setStartNodeId(s);
      setFlowName(res.data.name);
      setFlowId(res.data.id);
    });
  }, [id, setNodes, setEdges, navigate, api.getFlow]);

  useEffect(() => {
    if (!flowId || nodes.length === 0) {
      return;
    }
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }
    autosaveTimer.current = setTimeout(() => {
      localStorage.setItem(
        `${AUTOSAVE_KEY}-${flowId}`,
        JSON.stringify({ nodes, edges, startNodeId, name: flowName }),
      );
    }, AUTOSAVE_DELAY);
    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [nodes, edges, startNodeId, flowId, flowName]);

  const onConnect = useCallback(
    (connection: Connection) => {
      pushUndo();
      setEdges((eds) => addEdge(connection, eds));
      setHasUnsavedChanges(true);
    },
    [setEdges, pushUndo],
  );

  const onNodeClick = useCallback((_: unknown, node: Node<NodeData>) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Partial<NodeData>) => {
      pushUndo();
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
      );
      setSelectedNode((prev) =>
        prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev,
      );
      setHasUnsavedChanges(true);
    },
    [setNodes, pushUndo],
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    const definition = reactFlowToBackend(nodes, edges, startNodeId);
    const res = await api.updateFlow(flowId, {
      name: flowName,
      definition: definition as Record<string, unknown>,
    });
    setIsSaving(false);
    if (res.ok) {
      setHasUnsavedChanges(false);
      localStorage.removeItem(`${AUTOSAVE_KEY}-${flowId}`);
    }
  }, [nodes, edges, startNodeId, flowId, flowName, api]);

  const handleValidate = useCallback(async () => {
    const res = await api.validateFlow(flowId);
    if (!res.ok) {
      return;
    }
    const issues = res.data.validation.issues;
    const errorNodeIds = new Set(issues.filter((i) => i.nodeId).map((i) => i.nodeId as string));
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        className: errorNodeIds.has(n.id) ? "!border-red-500 ring-2 ring-red-300" : "",
      })),
    );
  }, [flowId, api, setNodes]);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData("application/reactflow");
      if (!nodeType) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nodeId = `${nodeType}-${Date.now()}`;
      const defaultData = getDefaultDataForType(nodeType);

      pushUndo();
      const newNode: Node<NodeData> = {
        id: nodeId,
        type: nodeType,
        position,
        data: defaultData,
      };
      setNodes((nds) => [...nds, newNode]);

      if (!startNodeId && nodes.length === 0) {
        setStartNodeId(nodeId);
      }
      setHasUnsavedChanges(true);
    },
    [reactFlowInstance, setNodes, pushUndo, startNodeId, nodes.length],
  );

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      const hasMoved = changes.some((c) => c.type === "position" && c.dragging === false);
      if (hasMoved) {
        setHasUnsavedChanges(true);
      }
    },
    [onNodesChange],
  );

  const handleNavigateBack = useCallback(() => {
    // biome-ignore lint/suspicious/noAlert: aviso de dirty-state antes de sair (spec flow-editor)
    if (hasUnsavedChanges && !window.confirm("Há alterações não salvas. Deseja sair sem salvar?")) {
      return;
    }
    navigate("/flows");
  }, [hasUnsavedChanges, navigate]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <FlowEditorLayout>
      <FlowEditorLayout.Toolbar>
        <FlowEditorLayout.ToolbarStart>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleNavigateBack}
            aria-label="Voltar para fluxos"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Fluxos
          </Button>
          <Input
            value={flowName}
            onChange={(e) => {
              setFlowName(e.target.value);
              setHasUnsavedChanges(true);
            }}
            className="h-9 max-w-xs border-none bg-transparent text-lg font-semibold shadow-none focus-visible:ring-0"
            aria-label="Nome do fluxo"
          />
          {hasUnsavedChanges && (
            <Badge variant="outline" className="border-amber-500 text-amber-600">
              Não salvo
            </Badge>
          )}
        </FlowEditorLayout.ToolbarStart>
        <FlowEditorLayout.ToolbarEnd>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={undo}
            title="Desfazer (Ctrl+Z)"
          >
            Desfazer
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={redo} title="Refazer (Ctrl+Y)">
            Refazer
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleValidate}>
            Validar
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              if (showSimulation) {
                simulation.reset();
                setShowSimulation(false);
              } else {
                handleSave().then(() => {
                  const def = reactFlowToBackend(nodes, edges, startNodeId);
                  simulation.start(def as Record<string, unknown>);
                  setShowSimulation(true);
                });
              }
            }}
          >
            {showSimulation ? "Fechar simulação" : "Simular"}
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </FlowEditorLayout.ToolbarEnd>
      </FlowEditorLayout.Toolbar>

      <FlowEditorLayout.Body>
        {!showSimulation && (
          <FlowEditorLayout.Palette>
            <NodePalette />
          </FlowEditorLayout.Palette>
        )}

        <FlowEditorLayout.Canvas onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView={true}
            deleteKeyCode="Delete"
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </FlowEditorLayout.Canvas>

        {selectedNode && !showSimulation && (
          <FlowEditorLayout.Panel>
            <NodePropertyPanel
              node={selectedNode}
              onUpdate={handleNodeUpdate}
              onClose={() => setSelectedNode(null)}
            />
          </FlowEditorLayout.Panel>
        )}

        {showSimulation && (
          <FlowEditorLayout.Panel>
            <SimulationPanel
              messages={simulation.messages as { sender: "bot" | "user"; text: string }[]}
              isComplete={simulation.isComplete}
              onSend={simulation.sendMessage}
              onReset={() => {
                const def = reactFlowToBackend(nodes, edges, startNodeId);
                simulation.start(def as Record<string, unknown>);
              }}
              onClose={() => {
                simulation.reset();
                setShowSimulation(false);
              }}
            />
          </FlowEditorLayout.Panel>
        )}
      </FlowEditorLayout.Body>
    </FlowEditorLayout>
  );
}

function getDefaultDataForType(type: string): NodeData {
  const base = { label: "", nodeType: type };
  switch (type) {
    case "message":
      return { ...base, label: "Mensagem", text: "" };
    case "option":
      return {
        ...base,
        label: "Opcoes",
        prompt: "",
        options: [{ id: `opt-${Date.now()}`, label: "Opcao 1", nextNodeId: "" }],
      };
    case "input":
      return { ...base, label: "Entrada", prompt: "", fieldKey: "" };
    case "transfer":
      return { ...base, label: "Transferir", reason: "" };
    case "end":
      return { ...base, label: "Fim", summaryMessage: "" };
    default:
      return base;
  }
}

export function FlowEditorPage() {
  return (
    <ReactFlowProvider>
      <FlowEditorInner />
    </ReactFlowProvider>
  );
}
