/** Shell principal do app. Layout responsivo com sidebar colapsavel e area de conteudo. */
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/use-auth";
import { useTheme } from "../hooks/use-theme";

type AppShellProps = Readonly<{
  sidebar?: ReactNode;
  children: ReactNode;
}>;

const NAV_ITEMS = [
  { path: "/inbox", label: "Inbox" },
  { path: "/flows", label: "Fluxos" },
  { path: "/schedules", label: "Agendamentos" },
  { path: "/settings", label: "Configuracoes" },
];

export function AppShell({ sidebar, children }: AppShellProps) {
  const { theme, toggleTheme } = useTheme();
  const { tenantSlug, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:flex-row">
      <header className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-gray-200 px-3 dark:border-gray-800 md:hidden">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Atende Facil</span>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs ${
                location.pathname.startsWith(item.path)
                  ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={toggleTheme}
          className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </header>

      <aside className="flex max-h-[38vh] w-full flex-shrink-0 flex-col border-b border-gray-200 dark:border-gray-800 md:max-h-none md:w-80 md:border-r md:border-b-0">
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
          <div className="min-w-0">
            <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
              Atende Facil
            </span>
            {tenantSlug && (
              <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                Tenant: {tenantSlug}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Sair
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
        <nav className="px-2 py-2 border-b border-gray-200 dark:border-gray-800">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-1.5 text-sm rounded-md mb-0.5 ${
                location.pathname.startsWith(item.path)
                  ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {sidebar && <div className="flex-1 overflow-y-auto">{sidebar}</div>}
      </aside>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
