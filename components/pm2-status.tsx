"use client";

import { useEffect, useState } from "react";

type PM2Process = {
  name: string;
  status: string;
  uptime: number;
  memory: number;
  cpu: number;
  restarts: number;
  pm_id: number;
  version?: string;
};

export default function PM2Status() {
  const [processes, setProcesses] = useState<PM2Process[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/pm2/status");

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load PM2 status");
      }

      const data = (await res.json()) as { processes: PM2Process[] };
      setProcesses(data.processes ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      void fetchStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "online":
        return "bg-emerald-950/40 border-emerald-500/40 text-emerald-200";
      case "stopped":
        return "bg-red-950/40 border-red-500/40 text-red-200";
      case "errored":
        return "bg-red-950/60 border-red-500/60 text-red-300";
      case "restarting":
        return "bg-yellow-950/40 border-yellow-500/40 text-yellow-200";
      default:
        return "bg-slate-950/40 border-slate-500/40 text-slate-200";
    }
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Discord Bot Status
        </h2>
        <button
          onClick={() => void fetchStatus()}
          disabled={loading}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-950/40 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {!error && processes.length === 0 && !loading && (
        <div className="rounded-md border border-slate-800/80 bg-slate-950/60 px-4 py-6 text-center text-sm text-slate-500">
          No Discord bot processes found in PM2.
        </div>
      )}

      {!error && processes.length > 0 && (
        <div className="space-y-3">
          {processes.map((proc) => (
            <div
              key={proc.pm_id}
              className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-100">{proc.name}</h3>
                  {proc.version && (
                    <span className="rounded-md bg-slate-800/60 px-2 py-0.5 text-xs font-mono text-slate-300 ring-1 ring-slate-700">
                      v{proc.version}
                    </span>
                  )}
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusBadgeColor(proc.status)}`}
                  >
                    {proc.status}
                  </span>
                </div>
                <span className="text-xs text-slate-500">ID: {proc.pm_id}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <div className="text-xs text-slate-400">Uptime</div>
                  <div className="text-sm font-medium text-slate-200">
                    {formatUptime(proc.uptime)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Memory</div>
                  <div className="text-sm font-medium text-slate-200">
                    {proc.memory} MB
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">CPU</div>
                  <div className="text-sm font-medium text-slate-200">
                    {proc.cpu.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Restarts</div>
                  <div className="text-sm font-medium text-slate-200">
                    {proc.restarts}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
