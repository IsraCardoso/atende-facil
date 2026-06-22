import { type LucideIcon, Search } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

export type DataTableEmptyStateVariant = "default" | "filtered";

export interface DataTableEmptyStateProps {
  variant?: DataTableEmptyStateVariant;
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  onClearFilters?: () => void;
  className?: string;
}

export function DataTableEmptyState({
  variant = "default",
  icon: Icon,
  title,
  description,
  action,
  onClearFilters,
  className,
}: DataTableEmptyStateProps) {
  const DefaultIcon = variant === "filtered" ? Search : Icon;
  const IconComponent = DefaultIcon ?? Search;

  return (
    <div className={cn("flex flex-col items-center gap-3 py-12", className)}>
      <IconComponent className="text-muted-foreground h-10 w-10" aria-hidden="true" />
      <div className="text-center">
        <p className="font-medium">{title}</p>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {variant === "filtered" && onClearFilters && (
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Limpar filtros
        </Button>
      )}
      {action}
    </div>
  );
}
