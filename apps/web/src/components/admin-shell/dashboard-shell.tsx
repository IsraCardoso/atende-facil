/** Layout autenticado portado de backoffice-app `dashboard-shell.tsx`. */
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type ReactNode, useCallback, useState, useSyncExternalStore } from "react";
import { Button } from "ui/button";
import { cn } from "ui/lib/utils";
import { Separator } from "ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

import { MobileNav } from "./mobile-nav";
import { SidebarNav } from "./sidebar-nav";
import { SidebarOperationalStatus } from "./sidebar-operational-status";
import { UserMenu } from "./user-menu";

const STORAGE_KEY = "sidebar-collapsed";

const emptySubscribe = () => () => {
  /* noop unsubscribe for useSyncExternalStore */
};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

type DashboardShellProps = Readonly<{
  children: ReactNode;
  /** @deprecated Use layout interno da página — não injetar painéis na nav global */
  sidebar?: ReactNode;
  mainClassName?: string;
  fullHeight?: boolean;
}>;

export function DashboardShell({
  children,
  sidebar,
  mainClassName,
  fullHeight = false,
}: DashboardShellProps) {
  const mounted = useMounted();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof globalThis.window === "undefined") {
      return false;
    }
    return globalThis.localStorage.getItem(STORAGE_KEY) === "true";
  });

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      globalThis.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const isCollapsed = mounted && collapsed;

  return (
    <div className="flex h-screen overflow-hidden">
      <header className="bg-background border-border fixed top-0 z-40 flex h-14 w-full items-center gap-2 border-b px-4 md:hidden">
        <MobileNav />
        <h1 className="text-lg font-semibold">Atende Fácil</h1>
      </header>

      <aside
        className={cn(
          "border-border bg-sidebar hidden flex-col border-r transition-[width] duration-300 md:flex",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex h-full flex-col">
          <div
            className={cn(
              "flex items-center border-b px-4 py-4",
              isCollapsed ? "justify-center" : "justify-between",
            )}
          >
            {!isCollapsed && <h2 className="text-lg font-semibold tracking-tight">Atende Fácil</h2>}
            <Tooltip>
              <TooltipTrigger asChild={true}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={toggle}
                  aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
                >
                  {isCollapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isCollapsed ? "Expandir menu" : "Recolher menu"}
              </TooltipContent>
            </Tooltip>
          </div>

          {sidebar && !isCollapsed && <div className="border-b p-2">{sidebar}</div>}

          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            <SidebarNav collapsed={isCollapsed} />
          </nav>

          <div className={cn("p-2", isCollapsed && "flex flex-col items-center")}>
            <Separator className="my-2" />
            <SidebarOperationalStatus collapsed={isCollapsed} />
            <UserMenu collapsed={isCollapsed} />
          </div>
        </div>
      </aside>

      <main
        className={cn(
          "flex min-w-0 flex-1 flex-col pt-14 md:pt-0",
          fullHeight
            ? "flex min-h-0 flex-col overflow-hidden p-6 [scrollbar-gutter:stable]"
            : "overflow-y-auto p-6 [scrollbar-gutter:stable]",
          mainClassName,
        )}
      >
        {children}
      </main>
    </div>
  );
}
