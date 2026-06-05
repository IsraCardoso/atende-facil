/** Integração WhatsApp self-service — compound component com provider (RN-029). */
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  createContext,
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Label } from "ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "ui/select";
import { Skeleton } from "ui/skeleton";
import { useAuth } from "../../hooks/use-auth";
import { useWhatsAppConnection } from "../../hooks/use-whatsapp-connection";
import { getApiErrorMessage } from "../../services/api-error";
import { createIntegrationOperationalApi } from "../../services/integration-operational-api";
import {
  createWhatsAppIntegrationApi,
  type WhatsAppInstanceDto,
} from "../../services/whatsapp-integration-api";
import { ConnectionStatusBadge } from "./connection-status-badge";

const QrPairingDialog = lazy(() =>
  import("./qr-pairing-dialog").then((mod) => ({ default: mod.QrPairingDialog })),
);

type ActionFeedback = Readonly<{
  type: "success" | "error";
  message: string;
}>;

type WhatsAppIntegrationContextValue = Readonly<{
  instance: WhatsAppInstanceDto | null;
  reload: () => Promise<void>;
}>;

const WhatsAppIntegrationContext = createContext<WhatsAppIntegrationContextValue | null>(null);

function useWhatsAppIntegrationContext(): WhatsAppIntegrationContextValue {
  const ctx = useContext(WhatsAppIntegrationContext);
  if (!ctx) {
    throw new Error("WhatsAppIntegration subcomponents must be used within WhatsAppIntegration");
  }
  return ctx;
}

type WhatsAppIntegrationProps = Readonly<{
  children?: ReactNode;
  onInstanceChange?: () => void;
}>;

function WhatsAppIntegrationRoot({ children, onInstanceChange }: WhatsAppIntegrationProps) {
  const { token } = useAuth();
  const api = useMemo(() => createWhatsAppIntegrationApi(() => token), [token]);
  const [instance, setInstance] = useState<WhatsAppInstanceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const response = await api.listInstances();
    if (response.ok && response.data) {
      const primary =
        response.data.instances.find((item) => item.isPrimary) ??
        response.data.instances[0] ??
        null;
      setInstance(primary);
      setLoadError(null);
    } else {
      setLoadError(getApiErrorMessage(response));
      setInstance(null);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    reload().then(
      () => undefined,
      () => undefined,
    );
  }, [reload]);

  const value = useMemo(() => ({ instance, reload }), [instance, reload]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (loadError && !instance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integração WhatsApp</CardTitle>
          <CardDescription>Não foi possível carregar a integração.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Erro ao carregar</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <p>{loadError}</p>
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={reload}>
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const cardProps = {
    loadError,
    ...(onInstanceChange !== undefined ? { onInstanceChange } : {}),
  };

  return (
    <WhatsAppIntegrationContext.Provider value={value}>
      {children ?? <WhatsAppIntegrationCard {...cardProps} />}
    </WhatsAppIntegrationContext.Provider>
  );
}

type WhatsAppIntegrationCardProps = Readonly<{
  onInstanceChange?: () => void;
  loadError: string | null;
}>;

function WhatsAppIntegrationCard({ onInstanceChange, loadError }: WhatsAppIntegrationCardProps) {
  const { token } = useAuth();
  const api = useMemo(() => createWhatsAppIntegrationApi(() => token), [token]);
  const operationalApi = useMemo(() => createIntegrationOperationalApi(() => token), [token]);
  const { instance, reload } = useWhatsAppIntegrationContext();
  const { status, reason, loading, refresh } = useWhatsAppConnection({
    api,
    instanceId: instance?.id ?? null,
    enabled: Boolean(instance),
  });

  const [provider, setProvider] = useState("evolution");
  const [saving, setSaving] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [pairing, setPairing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [platformAvailable, setPlatformAvailable] = useState(true);
  const [platformReason, setPlatformReason] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);

  const loadPlatformStatus = useCallback(async () => {
    const response = await operationalApi.getOperationalSummary();
    if (response.ok && response.data) {
      setPlatformAvailable(response.data.platform.available);
      setPlatformReason(response.data.platform.reason ?? null);
    }
  }, [operationalApi]);

  useEffect(() => {
    loadPlatformStatus().then(
      () => undefined,
      () => undefined,
    );
  }, [loadPlatformStatus]);

  const notifyChange = useCallback(async () => {
    await reload();
    onInstanceChange?.();
  }, [onInstanceChange, reload]);

  const handleEnable = useCallback(async () => {
    setSaving(true);
    setActionFeedback(null);
    const response = await api.createInstance({
      provider,
      displayName: "WhatsApp",
    });
    setSaving(false);
    if (response.ok) {
      setActionFeedback({
        type: "success",
        message: "Integração ativada. Conecte o WhatsApp para começar a receber mensagens.",
      });
      await notifyChange();
      return;
    }
    setActionFeedback({
      type: "error",
      message: getApiErrorMessage(response),
    });
  }, [api, notifyChange, provider]);

  const handlePair = useCallback(async () => {
    if (!instance) {
      return;
    }
    setPairing(true);
    setActionFeedback(null);
    const response = await api.startPairing(instance.id);
    setPairing(false);
    if (response.ok && response.data) {
      setQrBase64(response.data.pairing.qrBase64);
      setExpiresAt(response.data.pairing.expiresAt);
      setQrOpen(true);
      await refresh();
      return;
    }
    setActionFeedback({
      type: "error",
      message: getApiErrorMessage(response),
    });
  }, [api, instance, refresh]);

  const handleDisconnect = useCallback(async () => {
    if (!instance) {
      return;
    }
    setDisconnecting(true);
    setActionFeedback(null);
    const response = await api.disconnect(instance.id);
    setDisconnecting(false);
    if (response.ok) {
      await refresh();
      onInstanceChange?.();
      return;
    }
    setActionFeedback({
      type: "error",
      message: getApiErrorMessage(response),
    });
  }, [api, instance, onInstanceChange, refresh]);

  const handleDeactivate = useCallback(async () => {
    if (!instance) {
      return;
    }
    setDeactivating(true);
    setActionFeedback(null);
    const response = await api.deactivate(instance.id);
    setDeactivating(false);
    setDeactivateOpen(false);
    if (response.ok) {
      setActionFeedback({
        type: "success",
        message: "Integração desativada. Você pode ativar novamente quando quiser.",
      });
      await notifyChange();
      await loadPlatformStatus();
      return;
    }
    setActionFeedback({
      type: "error",
      message: getApiErrorMessage(response),
    });
  }, [api, instance, loadPlatformStatus, notifyChange]);

  useEffect(() => {
    if (status === "connected" && qrOpen) {
      setQrOpen(false);
      onInstanceChange?.();
    }
  }, [onInstanceChange, qrOpen, status]);

  if (!instance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integração WhatsApp</CardTitle>
          <CardDescription>
            Conecte o WhatsApp do tenant. A Evolution é gerenciada pela plataforma Atende Fácil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!platformAvailable ? (
            <Alert>
              <AlertCircle />
              <AlertTitle>Evolution API indisponível</AlertTitle>
              <AlertDescription>
                {platformReason ??
                  "Verifique EVOLUTION_API_URL, EVOLUTION_API_KEY e PUBLIC_API_URL no ambiente da API."}
              </AlertDescription>
            </Alert>
          ) : null}

          {actionFeedback?.type === "error" ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Não foi possível ativar</AlertTitle>
              <AlertDescription>{actionFeedback.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="wa-provider">Provedor</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="wa-provider" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                <SelectItem value="evolution">Evolution API (recomendado)</SelectItem>
                <SelectItem value="meta" disabled={true}>
                  Meta Cloud API (em breve)
                </SelectItem>
                <SelectItem value="zapi" disabled={true}>
                  Z-API (em breve)
                </SelectItem>
                <SelectItem value="uazapi" disabled={true}>
                  Uazapi (em breve)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={handleEnable}
            disabled={saving || provider !== "evolution"}
          >
            {saving ? "Ativando..." : "Ativar integração"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const instanceName =
    typeof instance.config.instanceName === "string" ? instance.config.instanceName : "—";
  const isOperational = status === "connected";

  return (
    <>
      <Card className={isOperational ? "border-green-500/40" : undefined}>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle>Integração WhatsApp</CardTitle>
            <CardDescription>
              Instância <span className="font-mono text-xs">{instanceName}</span> — gerenciada pela
              plataforma.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ConnectionStatusBadge status={status} loading={loading} />
            {isOperational ? (
              <Badge className="bg-green-600 hover:bg-green-600">Operacional</Badge>
            ) : (
              <Badge variant="outline">Configurada — aguardando conexão</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!platformAvailable ? (
            <Alert>
              <AlertCircle />
              <AlertTitle>Evolution API indisponível</AlertTitle>
              <AlertDescription>
                {platformReason ??
                  "Verifique EVOLUTION_API_URL, EVOLUTION_API_KEY e PUBLIC_API_URL no ambiente da API."}
              </AlertDescription>
            </Alert>
          ) : null}

          {loadError ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : null}

          {actionFeedback?.type === "error" ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Erro na operação</AlertTitle>
              <AlertDescription>{actionFeedback.message}</AlertDescription>
            </Alert>
          ) : null}

          {actionFeedback?.type === "success" ? (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>Integração ativada</AlertTitle>
              <AlertDescription>{actionFeedback.message}</AlertDescription>
            </Alert>
          ) : null}

          {isOperational ? (
            <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-300">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              WhatsApp conectado — a integração está ativa e pronta para receber mensagens.
            </div>
          ) : null}

          {reason && status === "error" ? (
            <p className="text-sm text-destructive">{reason}</p>
          ) : null}

          <div className="space-y-1">
            <Label className="text-muted-foreground">Webhook (somente leitura)</Label>
            <p className="break-all rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
              {instance.webhookUrl}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {status !== "connected" ? (
              <Button type="button" onClick={handlePair} disabled={pairing}>
                {pairing ? "Gerando QR..." : "Conectar WhatsApp"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? "Desconectando..." : "Desconectar"}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                refresh().then(
                  () => undefined,
                  () => undefined,
                );
              }}
              disabled={loading}
            >
              Atualizar status
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeactivateOpen(true)}
              disabled={deactivating}
            >
              Desativar integração
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desativar integração WhatsApp?</DialogTitle>
            <DialogDescription>
              A instância será removida na Evolution, o webhook deixará de receber mensagens e você
              precisará ativar novamente para parear o aparelho.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeactivateOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeactivate}
              disabled={deactivating}
            >
              {deactivating ? "Desativando..." : "Desativar integração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Suspense fallback={null}>
        <QrPairingDialog
          open={qrOpen}
          qrBase64={qrBase64}
          expiresAt={expiresAt}
          onOpenChange={setQrOpen}
          onRefresh={handlePair}
          refreshing={pairing}
        />
      </Suspense>
    </>
  );
}

export const WhatsAppIntegration = Object.assign(WhatsAppIntegrationRoot, {
  // biome-ignore lint/style/useNamingConvention: compound component subcomponents (react-composition-patterns)
  Card: WhatsAppIntegrationCard,
});
