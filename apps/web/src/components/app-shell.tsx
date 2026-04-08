/** Shell principal do app. Layout responsivo com sidebar colapsavel e area de conteudo. */
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

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
  const location = useLocation();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-gray-950">
      <aside className="hidden w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 md:flex md:flex-col">
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Atende Facil
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
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

      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
