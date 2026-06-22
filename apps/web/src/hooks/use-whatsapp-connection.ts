/** Polling de status WhatsApp enquanto conexão está em andamento (react-best-practices). */
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  createWhatsAppIntegrationApi,
  WhatsAppConnectionStatus,
} from "../services/whatsapp-integration-api";

const POLL_INTERVAL_MS = 4_000;

type WhatsAppApi = ReturnType<typeof createWhatsAppIntegrationApi>;

type UseWhatsAppConnectionInput = Readonly<{
  api: WhatsAppApi;
  instanceId: string | null;
  enabled?: boolean;
}>;

type UseWhatsAppConnectionResult = Readonly<{
  status: WhatsAppConnectionStatus | null;
  reason: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}>;

export function useWhatsAppConnection(
  input: UseWhatsAppConnectionInput,
): UseWhatsAppConnectionResult {
  const { api, instanceId, enabled = true } = input;
  const [status, setStatus] = useState<WhatsAppConnectionStatus | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!instanceId || !enabled) {
      return;
    }
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setLoading(true);

    const response = await api.getStatus(instanceId);
    if (response.ok && response.data) {
      setStatus(response.data.status.status);
      setReason(response.data.status.reason ?? null);
    }

    setLoading(false);
    inFlightRef.current = false;
  }, [api, enabled, instanceId]);

  useEffect(() => {
    refresh().then(
      () => undefined,
      () => undefined,
    );
  }, [refresh]);

  useEffect(() => {
    if (!instanceId || !enabled || status !== "connecting") {
      return;
    }

    const timer = window.setInterval(() => {
      refresh().then(
        () => undefined,
        () => undefined,
      );
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, instanceId, refresh, status]);

  return { status, reason, loading, refresh };
}
