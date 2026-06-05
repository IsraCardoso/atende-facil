/** Cabeçalho de página — padrão backoffice `page-header.tsx` com React Router. */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "ui/breadcrumb";
import { cn } from "ui/lib/utils";

export type PageHeaderBreadcrumbItem = Readonly<{
  label: string;
  href?: string;
}>;

export type PageHeaderProps = Readonly<{
  breadcrumbs?: readonly PageHeaderBreadcrumbItem[];
  title: string;
  description?: string;
  badges?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  className?: string;
}>;

export function PageHeader({
  breadcrumbs,
  title,
  description,
  badges,
  actions,
  toolbar,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <span key={item.href ?? item.label} className="contents">
                  <BreadcrumbItem>
                    {isLast || !item.href ? (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild={true}>
                        <Link to={item.href}>{item.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {badges}
          </div>
          {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-row items-center justify-end gap-2">{actions}</div>
        ) : null}
      </div>

      {toolbar ? <div className="mt-4 flex flex-wrap items-center gap-3">{toolbar}</div> : null}
    </div>
  );
}
