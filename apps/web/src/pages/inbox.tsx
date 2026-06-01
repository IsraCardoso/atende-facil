/** Página Inbox — lista de conversas + iframe Chatwoot. Entregável principal da sprint 06. */
import { useState } from "react";

import { AppShell } from "../components/app-shell";
import { ChatwootEmbed } from "../components/chatwoot-embed";
import { ConversationList } from "../components/conversation-list";
import { useAuth } from "../hooks/use-auth";

export function InboxPage() {
  const { token } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <AppShell
      sidebar={<ConversationList token={token} selectedId={selectedId} onSelect={setSelectedId} />}
    >
      {selectedId ? (
        <ChatwootEmbed conversationId={selectedId} token={token} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-gray-600 dark:text-gray-300">
          <p className="text-sm font-medium">Selecione uma conversa para iniciar o atendimento.</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Use a lista à esquerda (ou o menu no topo em telas menores).
          </p>
        </div>
      )}
    </AppShell>
  );
}
