/** Botão ícone com tooltip — ações compactas em tabelas (padrão backoffice). */
import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

type IconTooltipButtonProps = Readonly<{
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: "icon" | "icon-sm" | "icon-xs";
  disabled?: boolean;
  href?: string;
}>;

export function IconTooltipButton({
  icon: Icon,
  label,
  onClick,
  variant = "outline",
  size = "icon-sm",
  disabled = false,
  href,
}: IconTooltipButtonProps) {
  if (href) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled}
        aria-label={label}
        title={label}
        asChild={true}
      >
        <a href={href} target="_blank" rel="noopener noreferrer">
          <Icon className="size-4" />
        </a>
      </Button>
    );
  }

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild={true}>
        <Button
          type="button"
          variant={variant}
          size={size}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
