"use client";

import packageJson from "../package.json";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex-1" /> {/* Spacer for centering */}
        <div className="flex-1 text-center text-xs text-slate-600 dark:text-slate-400">
          © {currentYear} Nightscout Backup Dashboard
        </div>
        <div className="flex-1 text-right text-xs text-slate-600 dark:text-slate-400">
          v{packageJson.version}
        </div>
      </div>
    </footer>
  );
}

