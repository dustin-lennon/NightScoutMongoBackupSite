"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const themes = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" }
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only showing after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine the active theme: use theme if available, otherwise default to "system"
  const activeTheme = mounted ? (theme || "system") : null;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100/80 p-0.5 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
      {themes.map((t) => {
        // Only mark as active if it exactly matches the active theme
        const isActive = activeTheme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            className={`rounded-full px-2.5 py-1 transition ${
              isActive
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-300"
                : "hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}


