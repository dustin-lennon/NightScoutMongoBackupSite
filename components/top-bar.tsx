"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import Image from "next/image";

export function TopBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const user = session?.user;

  return (
    <header className="border-b border-slate-200 bg-white/80 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl items-center gap-4">
        <div className="flex items-center gap-2">
          <Image 
            src="/images/Nightscout_Logo.png"
            alt="Nightscout Logo"
            width={28}
            height={28}
            className="rounded-lg shadow"
          />
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Nightscout Backups
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />

          {status === "authenticated" && user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {user.image && (
                  <Image
                    src={user.image}
                    alt={user.name ?? "Discord avatar"}
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full border border-slate-700 object-cover"
                    unoptimized
                  />
                )}
                <span className="hidden sm:inline max-w-[140px] truncate">
                  {user.name ?? user.email}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-slate-800 bg-slate-950/95 p-3 text-xs text-slate-200 shadow-xl">
                  <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Signed in
                  </p>
                  <p className="truncate text-sm font-medium">
                    {user.name ?? user.email}
                  </p>
                  {user.email && (
                    <p className="truncate text-[11px] text-slate-500">
                      {user.email}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      signOut({ callbackUrl: "/auth/signin" });
                    }}
                    className="mt-3 w-full rounded-md bg-red-500/90 px-2 py-1.5 text-center text-xs font-semibold text-white hover:bg-red-400"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            pathname !== "/auth/signin" && (
              <button
                type="button"
                onClick={() => signIn("discord", { callbackUrl: "/" })}
                className="inline-flex items-center gap-2 rounded-full bg-[#5865F2] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#4752c4]"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px]">
                  💬
                </span>
                <span className="hidden sm:inline">Login with Discord</span>
                <span className="sm:hidden">Login</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}


