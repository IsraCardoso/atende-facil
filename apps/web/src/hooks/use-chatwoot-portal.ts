/** Busca URL do portal Chatwoot para atalho na inbox vazia. */
import { useEffect, useMemo, useState } from "react";

import { createApiClient } from "../services/api-client";

type ChatwootPortalResponse = Readonly<{
  portalUrl: string | null;
  reason?: string;
}>;

export function useChatwootPortal(token: string | null) {
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const api = useMemo(() => createApiClient({ baseUrl: "/api", getToken: () => token }), [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<ChatwootPortalResponse>("/integrations/chatwoot/portal")
      .then((res) => {
        if (res.ok) {
          setPortalUrl(res.data.portalUrl);
          setReason(res.data.reason ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, [api, token]);

  return { portalUrl, reason, loading };
}
