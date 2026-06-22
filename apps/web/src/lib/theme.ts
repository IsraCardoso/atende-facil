/** Persistência e aplicação do tema claro/escuro no documento. */

export type Theme = "light" | "dark";

const STORAGE_KEY = "atende-facil-theme";

export function getInitialTheme(): Theme {
  const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyThemeToDocument(theme: Theme): void {
  const root = globalThis.document?.documentElement;
  if (!root) {
    return;
  }
  root.classList.toggle("dark", theme === "dark");
}

export function persistTheme(theme: Theme): void {
  globalThis.localStorage?.setItem(STORAGE_KEY, theme);
}

export function initThemeOnDocument(): Theme {
  const theme = getInitialTheme();
  applyThemeToDocument(theme);
  return theme;
}
