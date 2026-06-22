/** Página Inbox — lista de conversas + Chatwoot (split-view, nav global intacta). */
import { ExternalLink, Inbox } from "lucide-react";
import { useState } from "react";
import { Button } from "ui/button";
import { DataTableEmptyState } from "ui/data-table-empty-state";
import { Skeleton } from "ui/skeleton";

import { AppShell } from "../components/app-shell";
import { ChatwootEmbed } from "../components/chatwoot-embed";
import { ConversationList } from "../components/conversation-list";
import { useAuth } from "../hooks/use-auth";
import { useChatwootPortal } from "../hooks/use-chatwoot-portal";

export function InboxPage() {
  const { token } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { portalUrl, reason, loading: portalLoading } = useChatwootPortal(token);

  return (
    <AppShell fullHeight={true} mainClassName="p-0 md:p-0">
      <div className="flex h-full min-h-0 flex-1 flex-col md:flex-row">
        <aside className="bg-background max-h-[38vh] shrink-0 overflow-hidden border-b md:max-h-none md:w-72 md:border-r md:border-b-0">
          <ConversationList token={token} selectedId={selectedId} onSelect={setSelectedId} />
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          {selectedId ? (
            <ChatwootEmbed conversationId={selectedId} token={token} />
          ) : (
            <InboxEmptyState portalUrl={portalUrl} reason={reason} loading={portalLoading} />
          )}
        </section>
      </div>
    </AppShell>
  );
}

function InboxEmptyState({
  portalUrl,
  reason,
  loading,
}: Readonly<{
  portalUrl: string | null;
  reason: string | null;
  loading: boolean;
}>) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <DataTableEmptyState
        icon={Inbox}
        title="Selecione uma conversa"
        description="Escolha um atendimento na lista à esquerda ou abra o painel Chatwoot."
        className="py-4"
      />
      {loading && <Skeleton className="h-9 w-40" />}
      {!loading && portalUrl && (
        <Button asChild={true} variant="default">
          <a href={portalUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            Abrir Chatwoot
          </a>
        </Button>
      )}
      {!loading && !portalUrl && reason && (
        <p className="text-muted-foreground max-w-sm text-center text-sm">{reason}</p>
      )}
    </div>
  );
}
