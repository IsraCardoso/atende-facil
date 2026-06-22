/** Layout compound do editor de fluxos — chrome sem lógica de negócio. */
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "ui/lib/utils";

function FlowEditorRoot({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("bg-muted/30 flex h-screen flex-col", className)}>{children}</div>;
}

function FlowEditorToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header
      className={cn(
        "bg-background flex shrink-0 items-center justify-between border-b px-4 py-2 shadow-sm",
        className,
      )}
    >
      {children}
    </header>
  );
}

function FlowEditorToolbarStart({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex min-w-0 items-center gap-3", className)}>{children}</div>;
}

function FlowEditorToolbarEnd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex shrink-0 items-center gap-2", className)}>{children}</div>;
}

function FlowEditorBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex min-h-0 flex-1 overflow-hidden", className)}>{children}</div>;
}

function FlowEditorPalette({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <aside className={cn("bg-background w-48 shrink-0 overflow-y-auto border-r", className)}>
      {children}
    </aside>
  );
}

function FlowEditorCanvas({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn("min-w-0 flex-1", className)} {...props}>
      {children}
    </div>
  );
}

function FlowEditorPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <aside className={cn("bg-background w-72 shrink-0 overflow-y-auto border-l", className)}>
      {children}
    </aside>
  );
}

export const FlowEditorLayout = Object.assign(FlowEditorRoot, {
  Toolbar: FlowEditorToolbar,
  ToolbarStart: FlowEditorToolbarStart,
  ToolbarEnd: FlowEditorToolbarEnd,
  Body: FlowEditorBody,
  Palette: FlowEditorPalette,
  Canvas: FlowEditorCanvas,
  Panel: FlowEditorPanel,
});
