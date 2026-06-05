import { useEffect, useState } from "react";
import { Button } from "ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";

type QrPairingDialogProps = Readonly<{
  open: boolean;
  qrBase64: string | null;
  expiresAt: number | null;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  refreshing?: boolean;
}>;

export function QrPairingDialog({
  open,
  qrBase64,
  expiresAt,
  onOpenChange,
  onRefresh,
  refreshing = false,
}: QrPairingDialogProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!open || !expiresAt) {
      return;
    }

    const tick = () => {
      setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, open]);

  const expired = secondsLeft === 0 && expiresAt !== null && expiresAt <= Date.now();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Abra o WhatsApp no celular → Aparelhos conectados → Conectar aparelho → escaneie o QR.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {qrBase64 ? (
            <img
              src={`data:image/png;base64,${qrBase64}`}
              alt="QR Code para pareamento WhatsApp"
              className="size-56 rounded-lg border bg-white p-2"
            />
          ) : (
            <div className="flex size-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Gerando QR...
            </div>
          )}

          {expiresAt && (
            <p className="text-sm text-muted-foreground">
              {expired ? "QR expirado." : `Expira em ${secondsLeft}s`}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button type="button" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? "Gerando..." : "Gerar novo QR"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
