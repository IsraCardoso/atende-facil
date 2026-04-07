/** Pagina de configuracoes do tenant. Timezone selecionavel (RN-028). */
import { useCallback, useMemo, useState } from "react";

import { AppShell } from "../components/app-shell";
import { useAuth } from "../hooks/use-auth";
import { createScheduleApi } from "../services/schedule-api";

const COMMON_TIMEZONES = [
  "America/Sao_Paulo",
  "America/Fortaleza",
  "America/Manaus",
  "America/Cuiaba",
  "America/Rio_Branco",
  "America/Noronha",
  "America/Belem",
  "America/Recife",
  "America/Bahia",
  "America/Campo_Grande",
  "America/Porto_Velho",
  "America/Boa_Vista",
  "America/Eirunepe",
  "America/Buenos_Aires",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Lisbon",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

export function SettingsPage() {
  const { token } = useAuth();
  const api = useMemo(() => createScheduleApi(() => token), [token]);

  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    const res = await api.updateTenantTimezone(timezone);
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [api, timezone]);

  return (
    <AppShell>
      <div className="p-6">
        <h1 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100">Configuracoes</h1>

        <div className="max-w-md rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
            Timezone do Tenant
          </h2>

          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Fuso horario usado para avaliar agendamentos de fluxo.
          </p>

          <div className="mb-4">
            <label
              htmlFor="timezone-select"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Timezone
            </label>
            <select
              id="timezone-select"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            {saved && (
              <span className="text-sm text-green-600 dark:text-green-400">Salvo com sucesso</span>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
