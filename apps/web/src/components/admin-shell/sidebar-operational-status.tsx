/** Indicadores compactos de WhatsApp e fluxo ativo — footer da sidebar. */
import { MessageCircle, Workflow } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { cn } from "ui/lib/utils";
import { Skeleton } from "ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

import { useAuth } from "../../hooks/use-auth";
import { useIntegrationOperationalSummary } from "../../hooks/use-integration-operational-summary";
import { createIntegrationOperationalApi } from "../../services/integration-operational-api";

type SidebarOperationalStatusProps = Readonly<{
  collapsed?: boolean;
}>;

type StatusTone = "success" | "warning" | "muted" | "danger";

const TONE_CLASS: Record<StatusTone, string> = {
  success: "bg-green-500",
  warning: "bg-amber-500",
  muted: "bg-muted-foreground/40",
  danger: "bg-destructive",
};

function StatusDot({ tone }: Readonly<{ tone: StatusTone }>) {
  return (
    <span className={cn("size-2 shrink-0 rounded-full", TONE_CLASS[tone])} aria-hidden="true" />
  );
}

function resolveWhatsAppStatus(
  configured: boolean,
  connectionStatus?: string,
): Readonly<{ label: string; tone: StatusTone }> {
  if (!configured) {
    return { label: "WhatsApp não ativado", tone: "muted" };
  }

  if (connectionStatus === "connected") {
    return { label: "WhatsApp conectado", tone: "success" };
  }

  if (connectionStatus === "connecting") {
    return { label: "Aguardando QR", tone: "warning" };
  }

  if (connectionStatus === "error") {
    return { label: "Erro na integração", tone: "danger" };
  }

  return { label: "WhatsApp desconectado", tone: "warning" };
}

function resolveFlowStatus(
  activeFlow: { name: string } | null,
): Readonly<{ label: string; tone: StatusTone }> {
  if (activeFlow) {
    return { label: `Fluxo ativo: ${activeFlow.name}`, tone: "success" };
  }

  return { label: "Nenhum fluxo ativo", tone: "warning" };
}

export function SidebarOperationalStatus({ collapsed = false }: SidebarOperationalStatusProps) {
  const { token } = useAuth();
  const api = useMemo(() => createIntegrationOperationalApi(() => token), [token]);
  const { summary, loading, error } = useIntegrationOperationalSummary({
    api,
    enabled: Boolean(token),
  });

  if (!token) {
    return null;
  }

  if (loading && !summary) {
    return (
      <div className={cn("mb-2 space-y-2", collapsed ? "px-1" : "px-1")}>
        <Skeleton className={cn(collapsed ? "mx-auto size-6 rounded-full" : "h-4 w-full")} />
        {!collapsed && <Skeleton className="h-4 w-full" />}
      </div>
    );
  }

  const whatsapp = summary?.whatsapp;
  const whatsappStatus = error
    ? { label: "Status indisponível", tone: "danger" as const }
    : resolveWhatsAppStatus(Boolean(whatsapp?.configured), whatsapp?.connectionStatus);

  const flowStatus = error
    ? { label: "Fluxo indisponível", tone: "danger" as const }
    : resolveFlowStatus(summary?.activeFlow ?? null);

  if (collapsed) {
    return (
      <div className="mb-2 flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <Link
              to="/settings"
              className="relative flex size-8 items-center justify-center rounded-md hover:bg-accent"
              aria-label={whatsappStatus.label}
            >
              <MessageCircle className="size-4" />
              <span className="absolute right-1.5 top-1.5">
                <StatusDot tone={whatsappStatus.tone} />
              </span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{whatsappStatus.label}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <Link
              to="/flows"
              className="relative flex size-8 items-center justify-center rounded-md hover:bg-accent"
              aria-label={flowStatus.label}
            >
              <Workflow className="size-4" />
              <span className="absolute right-1.5 top-1.5">
                <StatusDot tone={flowStatus.tone} />
              </span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{flowStatus.label}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <Link
      to="/settings"
      className="hover:bg-accent/60 mb-2 block rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 transition-colors"
    >
      <ul className="space-y-1.5 text-xs">
        <li className="flex items-center gap-2">
          <MessageCircle className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
          <StatusDot tone={whatsappStatus.tone} />
          <span className="truncate">{whatsappStatus.label}</span>
        </li>
        <li className="flex items-center gap-2">
          <Workflow className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
          <StatusDot tone={flowStatus.tone} />
          <span className="truncate">{flowStatus.label}</span>
        </li>
      </ul>
    </Link>
  );
}
