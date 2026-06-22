/** Painel operacional de integrações — compound component (react-composition-patterns). */
import { AlertCircle, CheckCircle2, Link2, RefreshCw, Workflow } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Skeleton } from "ui/skeleton";

import { useAuth } from "../../hooks/use-auth";
import { useIntegrationOperationalSummary } from "../../hooks/use-integration-operational-summary";
import type { IntegrationOperationalSummary } from "../../services/integration-operational-api";
import { createIntegrationOperationalApi } from "../../services/integration-operational-api";
import { ConnectionStatusBadge } from "../whatsapp-integration/connection-status-badge";

type IntegrationOperationalPanelContextValue = Readonly<{
  summary: IntegrationOperationalSummary | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}>;

const IntegrationOperationalPanelContext =
  createContext<IntegrationOperationalPanelContextValue | null>(null);

function useIntegrationOperationalPanelContext(): IntegrationOperationalPanelContextValue {
  const ctx = useContext(IntegrationOperationalPanelContext);
  if (!ctx) {
    throw new Error(
      "IntegrationOperationalPanel subcomponents must be used within IntegrationOperationalPanel",
    );
  }
  return ctx;
}

type IntegrationOperationalPanelProps = Readonly<{
  children?: ReactNode;
  onReload?: () => void;
}>;

function IntegrationOperationalPanelRoot({ children, onReload }: IntegrationOperationalPanelProps) {
  const { token } = useAuth();
  const api = useMemo(() => createIntegrationOperationalApi(() => token), [token]);
  const { summary, loading, error, reload } = useIntegrationOperationalSummary({ api });

  const handleReload = useCallback(async () => {
    await reload();
    onReload?.();
  }, [onReload, reload]);

  const value = useMemo(
    () => ({ summary, loading, error, reload: handleReload }),
    [summary, loading, error, handleReload],
  );

  if (loading && !summary) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <IntegrationOperationalPanelContext.Provider value={value}>
      {children ?? (
        <div className="space-y-4">
          <IntegrationOperationalPanel.Summary />
          {!error ? (
            <>
              <IntegrationOperationalPanel.WhatsAppStatus />
              <IntegrationOperationalPanel.ActiveFlow />
            </>
          ) : null}
        </div>
      )}
    </IntegrationOperationalPanelContext.Provider>
  );
}

function IntegrationOperationalPanelSummary() {
  const { summary, error, reload } = useIntegrationOperationalPanelContext();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status operacional</CardTitle>
          <CardDescription>
            Visão geral da integração e do atendimento automatizado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Não foi possível carregar o resumo</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <p>{error}</p>
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={reload}>
                <RefreshCw className="mr-2 size-4" />
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const whatsapp = summary?.whatsapp;
  const platform = summary?.platform;
  const isOperational = whatsapp?.configured && whatsapp.connectionStatus === "connected";

  let statusBadge = <Badge variant="secondary">Integração não ativada</Badge>;
  if (isOperational) {
    statusBadge = <Badge className="bg-green-600 hover:bg-green-600">Integração ativa</Badge>;
  } else if (whatsapp?.configured) {
    statusBadge = <Badge variant="outline">Configurada — aguardando conexão</Badge>;
  }

  return (
    <Card className={isOperational ? "border-green-500/40" : undefined}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="size-5 text-muted-foreground" aria-hidden="true" />
            Status operacional
          </CardTitle>
          <CardDescription>Integração WhatsApp e fluxo de atendimento do tenant.</CardDescription>
        </div>
        {statusBadge}
      </CardHeader>
      {platform && !platform.available ? (
        <CardContent>
          <Alert>
            <AlertCircle />
            <AlertTitle>Evolution API indisponível neste ambiente</AlertTitle>
            <AlertDescription>
              {platform.reason ??
                "Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e PUBLIC_API_URL na API antes de ativar a integração."}
            </AlertDescription>
          </Alert>
        </CardContent>
      ) : null}
    </Card>
  );
}

function IntegrationOperationalPanelWhatsAppStatus() {
  const { summary } = useIntegrationOperationalPanelContext();
  const whatsapp = summary?.whatsapp;

  if (!whatsapp?.configured) {
    return null;
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
        <div className="space-y-1">
          <p className="text-sm font-medium">WhatsApp</p>
          <p className="text-sm text-muted-foreground">
            {whatsapp.displayName ?? "Instância principal"}
            {whatsapp.phone ? ` · ${whatsapp.phone}` : ""}
          </p>
        </div>
        <ConnectionStatusBadge status={whatsapp.connectionStatus ?? null} />
      </CardContent>
    </Card>
  );
}

function IntegrationOperationalPanelActiveFlow() {
  const { summary } = useIntegrationOperationalPanelContext();
  const whatsapp = summary?.whatsapp;
  const activeFlow = summary?.activeFlow;

  if (!whatsapp?.configured || whatsapp.connectionStatus !== "connected") {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <Workflow className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Fluxo de atendimento</p>
              {activeFlow ? (
                <p className="text-sm text-muted-foreground">
                  Fluxo ativo:{" "}
                  <span className="font-medium text-foreground">{activeFlow.name}</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum fluxo ativo — mensagens não serão automatizadas.
                </p>
              )}
            </div>
          </div>
          {activeFlow ? (
            <Button type="button" variant="outline" size="sm" asChild={true}>
              <Link to="/flows">Ver fluxos</Link>
            </Button>
          ) : (
            <Button type="button" size="sm" asChild={true}>
              <Link to="/flows">Ativar um fluxo</Link>
            </Button>
          )}
        </div>
        {activeFlow ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Atendimento automatizado pronto para receber mensagens.
          </div>
        ) : (
          <Alert className="mt-4">
            <AlertCircle />
            <AlertTitle>Configure um fluxo ativo</AlertTitle>
            <AlertDescription>
              Publique e ative um fluxo em Fluxos para que o bot responda automaticamente.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export const IntegrationOperationalPanel = Object.assign(IntegrationOperationalPanelRoot, {
  // biome-ignore lint/style/useNamingConvention: compound component subcomponents (react-composition-patterns)
  Summary: IntegrationOperationalPanelSummary,
  // biome-ignore lint/style/useNamingConvention: compound component subcomponents (react-composition-patterns)
  WhatsAppStatus: IntegrationOperationalPanelWhatsAppStatus,
  // biome-ignore lint/style/useNamingConvention: compound component subcomponents (react-composition-patterns)
  ActiveFlow: IntegrationOperationalPanelActiveFlow,
});
