/** Página de configurações do tenant. Timezone selecionável (RN-028). */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Label } from "ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "ui/select";
import { Skeleton } from "ui/skeleton";

import { AppShell } from "../components/app-shell";
import { IntegrationOperationalPanel } from "../components/integration-operational-panel/integration-operational-panel";
import { PageHeader } from "../components/page-header";
import { WhatsAppIntegration } from "../components/whatsapp-integration/whatsapp-integration";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [integrationRevision, setIntegrationRevision] = useState(0);

  const handleIntegrationChange = useCallback(() => {
    setIntegrationRevision((current) => current + 1);
  }, []);

  useEffect(() => {
    api.getTenantTimezone().then((res) => {
      if (res.ok && res.data) {
        setTimezone(res.data.timezone);
      }
      setLoading(false);
    });
  }, [api]);

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
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Configurações"
          description="Preferências do tenant para agendamentos e operação."
        />

        <Card>
          <CardHeader>
            <CardTitle>Fuso horário do tenant</CardTitle>
            <CardDescription>
              Fuso horário usado para avaliar agendamentos de fluxo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="timezone-select">Fuso horário</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone-select" className="w-full">
                    <SelectValue placeholder="Selecione o fuso horário" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="max-h-60">
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex items-center gap-3">
                <Button type="button" onClick={handleSave} disabled={saving || loading}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
                {saved && (
                  <span className="text-sm text-green-600 dark:text-green-400">
                    Salvo com sucesso
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <IntegrationOperationalPanel
          key={`ops-${integrationRevision}`}
          onReload={handleIntegrationChange}
        />

        <WhatsAppIntegration onInstanceChange={handleIntegrationChange} />
      </div>
    </AppShell>
  );
}
