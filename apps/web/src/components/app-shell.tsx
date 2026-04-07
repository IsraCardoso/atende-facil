/** Shell principal do app. Layout responsivo com sidebar colapsável e área de conteúdo. */
import type { ReactNode } from "react";

import { useTheme } from "../hooks/use-theme";

type AppShellProps = Readonly<{
  sidebar: ReactNode;
  children: ReactNode;
}>;

export function AppShell({ sidebar, children }: AppShellProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-gray-950">
      <aside className="hidden w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 md:flex md:flex-col">
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Atende Fácil
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
        <div className="flex-1 overflow-y-auto">{sidebar}</div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
