/** Lista paginada de conversations com filtro por status. Consome GET /conversations. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  { value: "", label: "Todos" },
  { value: "waiting_human", label: "Aguardando" },
  { value: "human_active", label: "Em atendimento" },
  { value: "bot", label: "Bot" },
] as const;

const STATUS_BADGE: Readonly<Record<string, string>> = {
  waiting_human: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  human_active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  bot: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export function ConversationList({ token, selectedId, onSelect }: ConversationListProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<readonly ConversationItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const api = useMemo(() => createApiClient({ baseUrl: "/api", getToken: () => token }), [token]);

  const fetchConversations = useCallback(
    async (pageNum: number, append: boolean) => {
      setLoading(true);
      setFetchError(null);
      const params = new URLSearchParams({ page: String(pageNum), limit: "20" });
      if (statusFilter) {
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
        setFetchError("Nao foi possivel carregar conversas. Faca logout e entre no tenant correto.");
        if (!append) {
          setItems([]);
        }
      }
      setLoading(false);
    },
    [statusFilter, api, logout, navigate],
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchConversations(1, false);
  }, [token, fetchConversations]);

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchConversations(page + 1, true);
    }
  };

  return (
    <div className="flex flex-col gap-1 p-2">
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="mb-2 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {fetchError && (
        <p className="mb-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {fetchError}
        </p>
      )}

      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`flex flex-col gap-1 rounded-lg px-3 py-2 text-left transition-colors ${
            selectedId === item.id
              ? "bg-blue-50 dark:bg-blue-950"
              : "hover:bg-gray-50 dark:hover:bg-gray-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {item.phone}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[item.status] ?? ""}`}
            >
              {item.status}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(item.updatedAt).toLocaleString("pt-BR")}
          </span>
        </button>
      ))}

      {items.length === 0 && !loading && (
        <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Nenhuma conversa encontrada.
        </p>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mt-2 rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {loading ? "Carregando..." : "Carregar mais"}
        </button>
      )}
    </div>
  );
}
