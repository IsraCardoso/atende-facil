/** Menu de ações de fluxo — padrão billing `ActionsMenu` (MoreVertical + ícones). */
import { Archive, MoreVertical, PauseCircle, PlayCircle, Upload } from "lucide-react";
import { Button } from "ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";

type FlowAction = "publish" | "activate" | "deactivate" | "archive";

type FlowActionsMenuProps = Readonly<{
  flowName: string;
  status: string;
  onAction: (action: FlowAction) => void;
}>;

export function FlowActionsMenu({ flowName, status, onAction }: FlowActionsMenuProps) {
  if (status === "archived") {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={true}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={`Ações para ${flowName}`}
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[200]">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {status === "draft" && (
          <DropdownMenuItem onClick={() => onAction("publish")}>
            <Upload className="text-primary size-4" />
            Publicar
          </DropdownMenuItem>
        )}
        {status === "published" && (
          <DropdownMenuItem onClick={() => onAction("activate")}>
            <PlayCircle className="text-success size-4" />
            Ativar
          </DropdownMenuItem>
        )}
        {status === "active" && (
          <DropdownMenuItem onClick={() => onAction("deactivate")}>
            <PauseCircle className="size-4" />
            Desativar
          </DropdownMenuItem>
        )}
        {status !== "archived" && (
          <DropdownMenuItem variant="destructive" onClick={() => onAction("archive")}>
            <Archive className="size-4" />
            Arquivar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
