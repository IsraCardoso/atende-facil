/** Lista paginada de conversations com filtro por status. Consome GET /conversations. */
import { ChevronDown, ListFilter, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "ui/alert";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { DataTableEmptyState } from "ui/data-table-empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { cn } from "ui/lib/utils";
import { Skeleton } from "ui/skeleton";

import { useAuth } from "../hooks/use-auth";
import { createApiClient } from "../services/api-client";

type ConversationItem = Readonly<{
  id: string;
  phone: string;
  status: string;
  updatedAt: string;
}>;

type PaginatedResponse = Readonly<{
  data: readonly ConversationItem[];
  total: number;
  page: number;
  hasMore: boolean;
}>;

type ConversationListProps = Readonly<{
  token: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}>;

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "waiting_human", label: "Aguardando" },
  { value: "human_active", label: "Em atendimento" },
  { value: "bot", label: "Bot" },
] as const;

const STATUS_LABELS: Readonly<Record<string, string>> = {
  waiting_human: "Aguardando",
  human_active: "Em atendimento",
  bot: "Bot",
};

const STATUS_VARIANT: Readonly<
  Record<string, "default" | "secondary" | "outline" | "destructive">
> = {
  waiting_human: "outline",
  human_active: "default",
  bot: "secondary",
};

export function ConversationList({ token, selectedId, onSelect }: ConversationListProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<readonly ConversationItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const api = useMemo(() => createApiClient({ baseUrl: "/api", getToken: () => token }), [token]);

  const statusLabel = STATUS_OPTIONS.find((opt) => opt.value === statusFilter)?.label ?? "Todos";

  const fetchConversations = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!token) {
        return;
      }

      setIsFetching(hasLoadedOnceRef.current);
      if (!hasLoadedOnceRef.current) {
        setInitialLoading(true);
      }
      setFetchError(null);

      const params = new URLSearchParams({ page: String(pageNum), limit: "20" });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await api.get<PaginatedResponse>(`/conversations?${params.toString()}`);
      if (res.ok) {
        setItems((prev) => (append ? [...prev, ...res.data.data] : res.data.data));
        setHasMore(res.data.hasMore);
        setPage(pageNum);
      } else if (res.status === 401) {
        logout();
        navigate("/login", { replace: true });
      } else {
        setFetchError(
          "Não foi possível carregar conversas. Faça logout e entre no tenant correto.",
        );
        if (!append) {
          setItems([]);
        }
      }

      hasLoadedOnceRef.current = true;
      setIsFetching(false);
      setInitialLoading(false);
    },
    [statusFilter, api, logout, navigate, token],
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchConversations(1, false);
  }, [token, fetchConversations]);

  const loadMore = () => {
    if (hasMore && !isFetching && !initialLoading) {
      fetchConversations(page + 1, true);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild={true}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-between gap-2"
            aria-label="Filtrar por status"
          >
            <span className="flex min-w-0 items-center gap-2">
              <ListFilter className="size-4 shrink-0" />
              <span className="truncate">{statusLabel}</span>
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="z-[200] w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
            {STATUS_OPTIONS.map((opt) => (
              <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                {opt.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {fetchError && (
        <Alert variant="destructive">
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      <div className={cn("min-h-0 flex-1 space-y-1 overflow-y-auto", isFetching && "opacity-60")}>
        {initialLoading && (
          <div className="space-y-2 p-2">
            {(["one", "two", "three", "four"] as const).map((id) => (
              <Skeleton key={id} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        )}

        {!initialLoading &&
          items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-left transition-colors",
                selectedId === item.id
                  ? "bg-accent text-accent-foreground ring-primary ring-2"
                  : "hover:bg-muted/60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{item.phone}</span>
                <Badge variant={STATUS_VARIANT[item.status] ?? "outline"} className="shrink-0">
                  {STATUS_LABELS[item.status] ?? item.status}
                </Badge>
              </div>
              <span className="text-muted-foreground text-xs">
                {new Date(item.updatedAt).toLocaleString("pt-BR")}
              </span>
            </button>
          ))}

        {!initialLoading && !isFetching && items.length === 0 && (
          <DataTableEmptyState
            icon={MessageSquare}
            title="Nenhuma conversa"
            description="Nenhuma conversa encontrada com o filtro atual."
            className="py-8"
          />
        )}
      </div>

      {hasMore && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadMore}
          disabled={isFetching || initialLoading}
        >
          {isFetching ? "Carregando..." : "Carregar mais"}
        </Button>
      )}
    </div>
  );
}
