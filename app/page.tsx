"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import PM2Status from "@/components/pm2-status";

type BackupFile = {
  key: string;
  lastModified?: string;
  size?: number;
};

export default function DashboardPage() {
  const { status: authStatus } = useSession();
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const refreshBackups = async (showLoadedMessage = false) => {
    setLoadingList(true);
    setError(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/backups/list");

      if (!res.ok) {
        throw new Error("Failed to load backups");
      }

      const data = (await res.json()) as { files: BackupFile[] };

      setFiles(data.files ?? []);

      if (showLoadedMessage) {
        setStatusMessage("Loaded backup list from S3.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingList(false);
    }
  };

  // Automatically load backups once when the user is authenticated and the page
  // mounts, so the table isn't empty after login.
  useEffect(() => {
    if (!initialized && authStatus === "authenticated") {
      setInitialized(true);
      void refreshBackups(false);
    }
  }, [initialized, authStatus]);

  const triggerBackup = async () => {
    setCreatingBackup(true);
    setError(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/backups/create", {
        method: "POST"
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to create backup");
      }

      const data = await res.json();
      setStatusMessage(data.message ?? "Backup triggered.");
      await refreshBackups(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreatingBackup(false);
    }
  };

  const deleteBackup = async (key: string) => {
    setDeletingKey(key);
    setError(null);
    setStatusMessage(null);
    setConfirmDeleteKey(null);

    try {
      const res = await fetch(`/api/backups/delete?key=${encodeURIComponent(key)}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete backup");
      }

      const data = await res.json();
      setStatusMessage(data.message ?? "Backup deleted successfully.");
      await refreshBackups(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingKey(null);
    }
  };

  // Process files to remove "backups/" prefix from display names
  const filesWithDisplayNames = files.map((file) => ({
    ...file,
    displayName: file.key.replace(/^backups\//, "")
  }));

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Nightscout Backup Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Internal admin panel for managing compressed MongoDB backups in
              S3.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
            <div className="flex gap-3">
              <button
                onClick={() => void refreshBackups(true)}
                disabled={loadingList || creatingBackup}
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm ring-1 ring-slate-700 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingList ? "Loading..." : "Refresh"}
              </button>
              <button
                onClick={triggerBackup}
                disabled={creatingBackup || loadingList}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingBackup ? "Creating..." : "Create backup"}
              </button>
            </div>
          </div>
        </header>

        {(error || statusMessage) && (
          <div className="space-y-2">
            {error && (
              <div className="rounded-md border border-red-500/40 bg-red-950/40 px-4 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
            {statusMessage && !error && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-200">
                {statusMessage}
              </div>
            )}
          </div>
        )}

        {confirmDeleteKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-950 p-6 shadow-xl">
              <h3 className="mb-2 text-lg font-semibold text-slate-100">
                Confirm Delete
              </h3>
              <p className="mb-4 text-sm text-slate-300">
                Are you sure you want to delete{" "}
                <span className="font-mono text-slate-200">
                  {filesWithDisplayNames.find((f) => f.key === confirmDeleteKey)
                    ?.displayName ?? confirmDeleteKey}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDeleteKey(null)}
                  disabled={deletingKey !== null}
                  className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmDeleteKey) {
                      void deleteBackup(confirmDeleteKey);
                    }
                  }}
                  disabled={deletingKey !== null}
                  className="rounded-md bg-red-950/60 px-4 py-2 text-sm font-medium text-red-300 ring-1 ring-red-800/60 hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingKey === confirmDeleteKey ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              S3 Backup Files
            </h2>
            <span className="text-xs text-slate-500">
              Showing {files.length} file{files.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-800/80 bg-slate-950/60">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/60">
                <tr>
                  <th className="px-4 py-2 font-medium text-slate-300">
                    File Name
                  </th>
                  <th className="px-4 py-2 font-medium text-slate-300">
                    Last modified
                  </th>
                  <th className="px-4 py-2 font-medium text-slate-300">
                    Size
                  </th>
                  <th className="px-4 py-2 font-medium text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 && !loadingList && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-sm text-slate-500"
                    >
                      No backups found yet in S3.
                    </td>
                  </tr>
                )}
                {filesWithDisplayNames.map((file) => (
                  <tr
                    key={file.key}
                    className="border-t border-slate-800/60 hover:bg-slate-900/40"
                  >
                    <td className="max-w-xs truncate px-4 py-2 text-slate-100">
                      <a
                        href={`/api/backups/download?key=${encodeURIComponent(
                          file.key
                        )}`}
                        className="text-emerald-400 hover:text-emerald-300 hover:underline"
                      >
                        {file.displayName}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-slate-300">
                      {file.lastModified
                        ? new Date(file.lastModified).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-300">
                      {file.size != null
                        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setConfirmDeleteKey(file.key)}
                        disabled={deletingKey !== null || loadingList || creatingBackup}
                        className="rounded-md bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-300 ring-1 ring-red-800/60 hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingKey === file.key ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <PM2Status />
      </div>
    </main>
  );
}