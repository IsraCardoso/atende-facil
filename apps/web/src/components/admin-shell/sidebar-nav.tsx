/** Navegação lateral principal — padrão backoffice-app adaptado para React Router. */
import { Calendar, Inbox, Workflow } from "lucide-react";
import type { ComponentType } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "ui/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/inbox", label: "Inbox", icon: Inbox },
  { path: "/flows", label: "Fluxos", icon: Workflow },
  { path: "/schedules", label: "Agendamentos", icon: Calendar },
];

type SidebarNavProps = Readonly<{
  collapsed?: boolean;
  onNavigate?: () => void;
}>;

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const { pathname } = useLocation();

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const { path, label, icon: Icon } = item;
        const isActive = pathname === path || pathname.startsWith(`${path}/`);

        const link = (
          <Link
            key={path}
            to={path}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center rounded-md text-sm font-medium transition-colors",
              collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && label}
          </Link>
        );

        if (collapsed) {
          return (
            <Tooltip key={path}>
              <TooltipTrigger asChild={true}>{link}</TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          );
        }

        return link;
      })}
    </>
  );
}
