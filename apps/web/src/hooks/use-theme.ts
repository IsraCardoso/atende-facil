import { useCallback, useEffect, useState } from "react";

import { applyThemeToDocument, getInitialTheme, persistTheme, type Theme } from "../lib/theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    persistTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      persistTheme(next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme } as const;
}
