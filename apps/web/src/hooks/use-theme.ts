import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "atende-facil-theme";

function getInitialTheme(): Theme {
  const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeToDocument(theme: Theme): void {
  const root = globalThis.document?.documentElement;
  if (!root) {
    return;
  }
  root.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      globalThis.localStorage?.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, toggleTheme } as const;
}
