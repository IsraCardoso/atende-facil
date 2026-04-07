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
        <div className="flex flex-1 items-center justify-center text-gray-400 dark:text-gray-600">
          <p className="text-sm">Selecione uma conversa para iniciar o atendimento.</p>
        </div>
      )}
    </AppShell>
  );
}
