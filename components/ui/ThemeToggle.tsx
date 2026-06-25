"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="relative flex items-center justify-center w-9 h-9 rounded-full border border-card-border bg-surface hover:bg-surface-hover transition-all duration-300"
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      <Sun
        className={`w-4 h-4 absolute transition-all duration-300 ${
          theme === "dark"
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        className={`w-4 h-4 absolute transition-all duration-300 ${
          theme === "dark"
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}
