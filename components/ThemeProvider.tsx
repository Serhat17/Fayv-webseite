"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_COOKIE = "fayv-theme";

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  // 1. Saved preference
  const stored = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${THEME_COOKIE}=`))
    ?.split("=")[1];
  if (stored === "light" || stored === "dark") return stored;
  // 2. System preference
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = readInitialTheme();
    setThemeState(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [theme, mounted]);

  // React to system theme changes when the user hasn't set a preference yet.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const hasManualPreference = document.cookie.includes(`${THEME_COOKIE}=`);
      if (!hasManualPreference) setThemeState(e.matches ? "dark" : "light");
    };
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe default outside provider (shouldn't happen in production)
    return { theme: "light" as Theme, setTheme: () => {}, toggle: () => {} };
  }
  return ctx;
}
