import { cn } from "../../lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-accent", className)}
    />
  );
}

export { Skeleton };
