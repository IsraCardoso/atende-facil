import { Badge } from "ui/badge";

import type { WhatsAppConnectionStatus } from "../../services/whatsapp-integration-api";

const STATUS_LABEL: Record<WhatsAppConnectionStatus, string> = {
  connected: "Conectado",
  disconnected: "Desconectado",
  connecting: "Aguardando QR",
  error: "Erro",
};

const STATUS_VARIANT: Record<
  WhatsAppConnectionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  connected: "default",
  disconnected: "secondary",
  connecting: "outline",
  error: "destructive",
};

type ConnectionStatusBadgeProps = Readonly<{
  status: WhatsAppConnectionStatus | null;
  loading?: boolean;
}>;

export function ConnectionStatusBadge({ status, loading }: ConnectionStatusBadgeProps) {
  if (loading && !status) {
    return <Badge variant="outline">Verificando...</Badge>;
  }

  if (!status) {
    return <Badge variant="secondary">Desconhecido</Badge>;
  }

  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
