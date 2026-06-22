/** Painel de conversa: iframe Chatwoot quando configurado; fallback com dados da sessão em dev local. */
import { type RefCallback, useCallback, useEffect, useState } from "react";

import { createApiClient } from "../services/api-client";

type ChatwootEmbedProps = Readonly<{
  conversationId: string;
  token: string | null;
}>;

type ConversationAccessDevContext = Readonly<{
  phone: string;
  status: "bot" | "waiting_human" | "human_active";
  sessionData: Readonly<Record<string, unknown>>;
}>;

type AccessUrls = Readonly<{
  embedUrl: string | null;
  deepLink: string | null;
  reason?: string;
  devContext?: ConversationAccessDevContext;
}>;

const STATUS_LABELS: Readonly<Record<ConversationAccessDevContext["status"], string>> = {
  bot: "Bot",
  waiting_human: "Aguardando atendente",
  human_active: "Em atendimento humano",
};

const SESSION_FIELD_LABELS: Readonly<Record<string, string>> = {
  customerName: "Nome",
  addressOrCep: "CEP / Endereço",
  issueDescription: "Problema relatado",
  cpf: "CPF",
  contractNumber: "Nº do contrato",
  subject: "Assunto",
};

function formatSessionValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function ConversationDevPanel({
  devContext,
  reason,
}: Readonly<{
  devContext: ConversationAccessDevContext;
  reason?: string;
}>) {
  const entries = Object.entries(devContext.sessionData);

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-gray-50 p-6 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Atendimento humano (modo local)
          </h2>
          {reason && <p className="text-sm text-amber-700 dark:text-amber-300">{reason}</p>}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            O hand-off do bot funcionou. Para responder pelo painel embutido, suba uma instância
            Chatwoot e configure <code className="text-xs">CHATWOOT_APP_URL</code> no{" "}
            <code className="text-xs">.env</code>.
          </p>
        </div>

        <dl className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-3 gap-4 px-4 py-3">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Telefone</dt>
            <dd className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
              {devContext.phone}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-4 px-4 py-3">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
            <dd className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
              {STATUS_LABELS[devContext.status]}
            </dd>
          </div>
        </dl>

        {entries.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Dados coletados pelo bot
            </h3>
            <dl className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
              {entries.map(([key, value]) => (
                <div key={key} className="grid grid-cols-3 gap-4 px-4 py-3">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {SESSION_FIELD_LABELS[key] ?? key}
                  </dt>
                  <dd className="col-span-2 break-words text-sm text-gray-900 dark:text-gray-100">
                    {formatSessionValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nenhum dado adicional foi salvo na sessão desta conversa.
          </p>
        )}
      </div>
    </div>
  );
}

export function ChatwootEmbed({ conversationId, token }: ChatwootEmbedProps) {
  const [urls, setUrls] = useState<AccessUrls | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setIframeError(false);
    setUrls(null);

    const api = createApiClient({
      baseUrl: "/api",
      getToken: () => token,
    });

    api
      .get<AccessUrls>(`/conversations/${conversationId}/access`)
      .then((res) => {
        if (res.ok) {
          setUrls(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, [conversationId, token]);

  const iframeRef: RefCallback<HTMLIFrameElement> = useCallback((node) => {
    if (!node) {
      return;
    }
    node.onerror = () => setIframeError(true);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">
        Carregando conversa...
      </div>
    );
  }

  if (urls?.devContext && !urls.embedUrl && !urls.deepLink) {
    return (
      <ConversationDevPanel
        devContext={urls.devContext}
        {...(urls.reason !== undefined ? { reason: urls.reason } : {})}
      />
    );
  }

  if (!urls || (!urls.embedUrl && !urls.deepLink)) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-center text-gray-500 dark:text-gray-400">
        {urls?.reason ?? "Conversa sem vínculo com Chatwoot."}
      </div>
    );
  }

  if (iframeError || !urls.embedUrl) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Não foi possível carregar o Chatwoot embutido.
        </p>
        {urls.deepLink && (
          <a
            href={urls.deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Abrir no Chatwoot
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Conversa #{conversationId.slice(0, 8)}
        </span>
        {urls.deepLink && (
          <a
            href={urls.deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            Abrir no Chatwoot
          </a>
        )}
      </div>
      <iframe
        ref={iframeRef}
        src={urls.embedUrl}
        title="Chatwoot"
        className="flex-1 border-0"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    </div>
  );
}
