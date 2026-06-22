import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

export interface DataTableErrorStateProps {
  message?: string;
  onRetry: () => void;
  className?: string;
}

export function DataTableErrorState({
  message = "Não foi possível carregar os dados. Tente novamente.",
  onRetry,
  className,
}: DataTableErrorStateProps) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 py-12", className)}>
      <AlertCircle className="text-destructive h-10 w-10" aria-hidden="true" />
      <div className="text-center">
        <p className="font-medium">Erro ao carregar dados</p>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Tentar novamente
      </Button>
    </div>
  );
}
