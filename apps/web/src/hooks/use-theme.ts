import { useCallback, useEffect, useState } from "react";

import { applyThemeToDocument, getInitialTheme, persistTheme, type Theme } from "../lib/theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      persistTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme } as const;
}
