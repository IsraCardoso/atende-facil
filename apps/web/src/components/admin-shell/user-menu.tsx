/** Menu do usuário no footer da sidebar — padrão backoffice `user-menu.tsx`. */
import { LogOut, Moon, Settings, Sun } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { cn } from "ui/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

import { useAuth } from "../../hooks/use-auth";
import { useTheme } from "../../hooks/use-theme";

const THEME_OPTIONS = [
  { value: "light" as const, label: "Claro", icon: Sun },
  { value: "dark" as const, label: "Escuro", icon: Moon },
] as const;

type UserMenuProps = Readonly<{
  collapsed?: boolean;
}>;

export function UserMenu({ collapsed = false }: UserMenuProps) {
  const { tenantSlug, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const displayName = tenantSlug ?? "Configurações";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleThemeChange = (value: string) => {
    if (value === "light" || value === "dark") {
      setTheme(value);
    }
  };

  const trigger = (
    <DropdownMenuTrigger asChild={true}>
      <Button
        type="button"
        variant="ghost"
        size={collapsed ? "icon" : "sm"}
        className={cn(collapsed ? "h-9 w-9" : "w-full justify-start gap-2 truncate")}
        aria-label="Menu do usuário"
      >
        <Settings className="size-4 shrink-0" />
        {!collapsed && <span className="truncate">{displayName}</span>}
      </Button>
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild={true}>{trigger}</TooltipTrigger>
          <TooltipContent side="right">{displayName}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent side="top" align="start" className="z-[200] w-56">
        <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild={true}>
          <Link to="/settings" className="flex items-center gap-2">
            <Settings className="size-4" />
            Configurações do tenant
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
            Tema
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <DropdownMenuRadioItem key={value} value={value}>
                <Icon className="size-4" />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
