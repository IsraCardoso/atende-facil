/** Busca URL do portal Chatwoot para o botão "Abrir Chatwoot" da inbox vazia. */
import { useCallback, useMemo, useState } from "react";

import { createApiClient } from "../services/api-client";

type ChatwootPortalResponse = Readonly<{
  portalUrl: string | null;
  reason?: string;
}>;

export function useChatwootPortal(token: string | null) {
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const api = useMemo(() => createApiClient({ baseUrl: "/api", getToken: () => token }), [token]);

  // O portalUrl pode ser um login único do Chatwoot (SSO) — reusar a mesma URL numa 2a
  // abertura falha. Por isso não guardamos a URL em estado: cada clique busca uma nova.
  const openPortal = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<ChatwootPortalResponse>("/integrations/chatwoot/portal");
      if (res.ok && res.data.portalUrl) {
        window.open(res.data.portalUrl, "_blank", "noopener,noreferrer");
        setReason(null);
      } else {
        setReason(res.ok ? (res.data.reason ?? null) : null);
      }
    } finally {
      setLoading(false);
      setChecked(true);
    }
  }, [api, token]);

  return { openPortal, reason, loading, checked };
}
