import { Skeleton } from "./ui/skeleton";
import { TableCell, TableRow } from "./ui/table";

export interface DataTableSkeletonProps {
  rowCount?: number;
  columnCount?: number;
}

export function DataTableSkeleton({ rowCount = 8, columnCount = 5 }: DataTableSkeletonProps) {
  return Array.from({ length: rowCount }).map((_, rowIndex) => (
    <TableRow
      key={rowIndex}
      aria-busy={rowIndex === 0 ? true : undefined}
      aria-label={rowIndex === 0 ? "Carregando dados" : undefined}
    >
      {Array.from({ length: columnCount }).map((__, colIndex) => (
        <TableCell key={colIndex}>
          <Skeleton className={cnSkeletonWidth(colIndex, columnCount)} />
        </TableCell>
      ))}
    </TableRow>
  ));
}

function cnSkeletonWidth(colIndex: number, columnCount: number): string {
  const widths = ["w-16", "w-32", "w-24", "w-20", "w-28", "w-12", "w-36"];
  if (colIndex === columnCount - 1 && columnCount > 3) {
    return "h-8 w-8 rounded-md";
  }
  if (colIndex === 2 && columnCount > 2) {
    return "h-5 w-20 rounded-full";
  }
  return `h-4 ${widths[colIndex % widths.length]}`;
}
