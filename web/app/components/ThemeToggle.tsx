"use client";

import { useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

function readTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(readTheme);
  const isDark = theme === "dark";

  function toggle() {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
  }

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-app-fg-muted dark:text-brand-fg-muted">
      <span className="flex items-center gap-2">
        {isDark ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
        Mode sombre
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Activer le mode sombre"
        onClick={toggle}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 ${
          isDark ? "bg-accent-500" : "bg-app-border dark:bg-brand-border"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 ${
            isDark ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
