/** Iframe do Chatwoot com detecção de falha e fallback via deep-link (RN-017). */
import { type RefCallback, useCallback, useEffect, useState } from "react";

import { createApiClient } from "../services/api-client";

type ChatwootEmbedProps = Readonly<{
  conversationId: string;
  token: string | null;
}>;

type AccessUrls = Readonly<{
  embedUrl: string | null;
  deepLink: string | null;
  reason?: string;
}>;

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

  if (!urls || (!urls.embedUrl && !urls.deepLink)) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">
        {urls?.reason ?? "Conversa sem vínculo com Chatwoot."}
      </div>
    );
  }

  if (iframeError || !urls.embedUrl) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
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
