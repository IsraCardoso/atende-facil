/** Listagem de flows com design system (RN-020) — layout padrão billing backoffice. */
import { AlertTriangle, ListFilter, Plus, Workflow } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "ui/alert";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { DataTableEmptyState } from "ui/data-table-empty-state";
import { DataTableSkeleton } from "ui/data-table-skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "ui/dialog";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { cn } from "ui/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "ui/table";

import { AppShell } from "../components/app-shell";
import { FlowActionsMenu } from "../components/flow-actions-menu";
import { PageHeader } from "../components/page-header";
import { useAuth } from "../hooks/use-auth";
import { flowTemplates } from "../lib/flow-templates";
import { createFlowApi, type FlowDto, type ValidationIssue } from "../services/flow-api";

const STATUS_VARIANT: Record<
  string,
  { variant: "default" | "secondary" | "outline" | "destructive"; label: string }
> = {
  draft: { variant: "secondary", label: "Rascunho" },
  published: { variant: "outline", label: "Publicado" },
  active: { variant: "default", label: "Ativo" },
  archived: { variant: "destructive", label: "Arquivado" },
};

type FlowAction = "go-live" | "publish" | "activate" | "deactivate" | "archive" | "delete";

type GoLiveErrorPayload = Readonly<{
  code?: string;
  details?: Readonly<{ issues?: readonly ValidationIssue[] }>;
}>;

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Rascunho" },
  { value: "published", label: "Publicado" },
  { value: "active", label: "Ativo" },
  { value: "archived", label: "Arquivado" },
];

const COL_COUNT = 5;

export function FlowsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const api = useMemo(() => createFlowApi(() => token), [token]);

  const [flows, setFlows] = useState<readonly FlowDto[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [goLiveIssues, setGoLiveIssues] = useState<Readonly<{
    flowName: string;
    issues: readonly ValidationIssue[];
  }> | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedOnceRef = useRef(false);

  const loadFlows = useCallback(async () => {
    setIsFetching(hasLoadedOnceRef.current);

    const res = await api.listFlows(statusFilter !== "all" ? { status: statusFilter } : {});

    if (res.ok) {
      setFlows(res.data.data);
    }

    hasLoadedOnceRef.current = true;
    setIsFetching(false);
    setInitialLoading(false);
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

    if (!res.ok) {
      return;
    }

    const template = flowTemplates.find((t) => t.id === selectedTemplateId);
    setSelectedTemplateId(null);

    if (template) {
      await api.updateFlow(res.data.flow.id, { definition: template.definition });
    }

    navigate(`/flows/${res.data.flow.id}/edit`);
  };

  const handleAction = async (flowId: string, flowName: string, action: FlowAction) => {
    switch (action) {
      case "go-live": {
        const res = await api.goLiveFlow(flowId);
        if (!res.ok) {
          const errorPayload = res.data as unknown as GoLiveErrorPayload;
          if (errorPayload.code === "FLOW_VALIDATION_FAILED" && errorPayload.details?.issues) {
            setGoLiveIssues({ flowName, issues: errorPayload.details.issues });
          }
        }
        break;
      }
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

  const isEmpty = !initialLoading && !isFetching && flows.length === 0;
  const hasActiveFilter = statusFilter !== "all";

  return (
    <AppShell fullHeight={true}>
      <div className="flex h-full min-h-0 flex-col gap-6">
        <PageHeader
          className="shrink-0"
          title="Fluxos"
          description="Gerencie fluxos de atendimento automatizado do tenant."
          actions={
            <Button type="button" className="gap-2" onClick={() => setShowCreateDialog(true)}>
              <Plus className="size-4" />
              Novo fluxo
            </Button>
          }
          toolbar={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] gap-2" size="sm" aria-label="Filtrar por status">
                <ListFilter className="size-4 shrink-0" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <div className="min-h-0 flex-1 overflow-auto rounded-md border [&>[data-slot=table-container]]:overflow-visible">
          <Table className="min-w-[720px]">
            <TableHeader className="bg-background sticky top-0 z-10">
              <TableRow>
                <TableHead className="min-w-[200px]">Nome</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[80px]">Versão</TableHead>
                <TableHead className="w-[120px]">Atualizado</TableHead>
                <TableHead className="w-[44px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={cn(isFetching && "opacity-60")}>
              {initialLoading && <DataTableSkeleton rowCount={5} columnCount={COL_COUNT} />}

              {isEmpty && (
                <TableRow>
                  <TableCell colSpan={COL_COUNT} className="h-48 p-0">
                    <DataTableEmptyState
                      variant={hasActiveFilter ? "filtered" : "default"}
                      icon={Workflow}
                      title={
                        hasActiveFilter ? "Nenhum resultado encontrado" : "Nenhum fluxo encontrado"
                      }
                      description={
                        hasActiveFilter
                          ? "Tente outro filtro de status."
                          : "Crie seu primeiro fluxo de atendimento automatizado."
                      }
                      {...(hasActiveFilter
                        ? { onClearFilters: () => setStatusFilter("all") }
                        : {
                            action: (
                              <Button type="button" onClick={() => setShowCreateDialog(true)}>
                                Criar primeiro fluxo
                              </Button>
                            ),
                          })}
                    />
                  </TableCell>
                </TableRow>
              )}

              {!initialLoading &&
                !isEmpty &&
                flows.map((flow) => {
                  const status = STATUS_VARIANT[flow.status] ?? STATUS_VARIANT.draft;
                  return (
                    <TableRow key={flow.id}>
                      <TableCell className="align-middle">
                        <button
                          type="button"
                          onClick={() => navigate(`/flows/${flow.id}/edit`)}
                          className="text-primary text-left text-sm font-medium hover:underline"
                        >
                          {flow.name}
                        </button>
                        {flow.description && (
                          <p className="text-muted-foreground mt-0.5 text-xs line-clamp-1">
                            {flow.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="align-middle">
                        <Badge variant={status?.variant ?? "secondary"}>
                          {status?.label ?? flow.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground align-middle text-sm">
                        v{flow.version}
                      </TableCell>
                      <TableCell className="text-muted-foreground align-middle text-sm">
                        {new Date(flow.updatedAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="align-middle text-right">
                        <FlowActionsMenu
                          flowName={flow.name}
                          status={flow.status}
                          onAction={(action) => handleAction(flow.id, flow.name, action)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo fluxo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-flow-name">Nome do fluxo</Label>
                <Input
                  ref={createInputRef}
                  id="new-flow-name"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateSubmit();
                    }
                  }}
                  placeholder="Meu fluxo de atendimento"
                />
              </div>

              <div className="space-y-2">
                <Label>Ponto de partida</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateId(null)}
                    className={cn(
                      "rounded-md border p-3 text-left text-sm transition-colors",
                      selectedTemplateId === null
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent",
                    )}
                  >
                    <p className="font-medium">Em branco</p>
                    <p className="text-muted-foreground text-xs">Monte o fluxo do zero.</p>
                  </button>
                  {flowTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={cn(
                        "rounded-md border p-3 text-left text-sm transition-colors",
                        selectedTemplateId === template.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-accent",
                      )}
                    >
                      <p className="font-medium">{template.name}</p>
                      <p className="text-muted-foreground text-xs">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewFlowName("");
                  setSelectedTemplateId(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleCreateSubmit} disabled={!newFlowName.trim()}>
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={goLiveIssues !== null} onOpenChange={() => setGoLiveIssues(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Não foi possível ativar "{goLiveIssues?.flowName}"</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {goLiveIssues?.issues.map((issue) => (
                <Alert
                  key={`${issue.code}-${issue.nodeId ?? "flow"}-${issue.message}`}
                  variant={issue.severity === "error" ? "destructive" : "default"}
                >
                  <AlertTriangle className="size-4" />
                  <AlertDescription>{issue.message}</AlertDescription>
                </Alert>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setGoLiveIssues(null)}>
                Entendi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
