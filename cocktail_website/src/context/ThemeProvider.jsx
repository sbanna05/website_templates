import { useCallback, useEffect, useMemo, useState } from "react";
import { safeStorage } from "../lib/format";
import { THEME_ORDER, THEME_STORAGE_KEY, ThemeContext } from "./contexts";

const isTheme = (value) => THEME_ORDER.includes(value);

function getInitialTheme() {
  // index.html already applied the theme before first paint (no flash) – reuse it.
  const applied = document.documentElement.dataset.theme;
  if (isTheme(applied)) return applied;

  const stored = safeStorage.get(THEME_STORAGE_KEY);
  if (isTheme(stored)) return stored;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    safeStorage.set(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme((current) => THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length]);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, cycleTheme }), [theme, cycleTheme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}
