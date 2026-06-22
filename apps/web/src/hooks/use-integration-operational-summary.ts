/** Carrega resumo operacional de integrações para Configurações (async-parallel no backend). */
import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "../services/api-error";
import type {
  createIntegrationOperationalApi,
  IntegrationOperationalSummary,
} from "../services/integration-operational-api";

type IntegrationOperationalApi = ReturnType<typeof createIntegrationOperationalApi>;

type UseIntegrationOperationalSummaryInput = Readonly<{
  api: IntegrationOperationalApi;
  enabled?: boolean;
  pollWhenConnecting?: boolean;
}>;

type UseIntegrationOperationalSummaryResult = Readonly<{
  summary: IntegrationOperationalSummary | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}>;

const POLL_INTERVAL_MS = 5_000;

export function useIntegrationOperationalSummary(
  input: UseIntegrationOperationalSummaryInput,
): UseIntegrationOperationalSummaryResult {
  const { api, enabled = true, pollWhenConnecting = true } = input;
  const [summary, setSummary] = useState<IntegrationOperationalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      return;
    }

    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setLoading(true);

    const response = await api.getOperationalSummary();
    if (response.ok) {
      setSummary(response.data);
      setError(null);
    } else {
      setError(getApiErrorMessage(response));
    }

    setLoading(false);
    inFlightRef.current = false;
  }, [api, enabled]);

  useEffect(() => {
    reload().then(
      () => undefined,
      () => undefined,
    );
  }, [reload]);

  const isConnecting = summary?.whatsapp.connectionStatus === "connecting";

  useEffect(() => {
    if (!enabled || !pollWhenConnecting || !isConnecting) {
      return;
    }

    const timer = window.setInterval(() => {
      reload().then(
        () => undefined,
        () => undefined,
      );
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, isConnecting, pollWhenConnecting, reload]);

  return { summary, loading, error, reload };
}
