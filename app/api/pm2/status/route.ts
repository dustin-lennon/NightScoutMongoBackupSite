import { NextResponse } from "next/server";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

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

export async function GET() {
  try {
    // Get PM2 process list in JSON format
    const { stdout, stderr } = await execAsync("pm2 jlist");
    
    if (stderr) {
      console.error("[pm2/status] PM2 stderr:", stderr);
    }

    const processes = JSON.parse(stdout) as Array<{
      name: string;
      pm_id: number;
      status: string;
      pm2_env: {
        status: string;
        pm_uptime: number;
        restart_time: number;
        memory?: { rss?: number };
        cpu?: number;
        version?: string;
        env?: {
          VERSION?: string;
          [key: string]: unknown;
        };
        [key: string]: unknown; // Allow other properties
      };
      monit: {
        memory?: number;
        cpu?: number;
      };
    }>;

    // Filter for Discord bot (assuming it's named something like "nightscout-backup-bot" or contains "bot")
    const botProcesses = processes.filter((proc) =>
      proc.name.toLowerCase().includes("bot")
    );

    if (botProcesses.length === 0) {
      return NextResponse.json(
        { error: "No Discord bot process found in PM2" },
        { status: 404 }
      );
    }

    // Map to our response format
    const status: PM2Process[] = botProcesses.map((proc) => {
      const uptime = Date.now() - proc.pm2_env.pm_uptime;
      const memory = proc.monit.memory ?? proc.pm2_env.memory?.rss ?? 0;
      const cpu = proc.monit.cpu ?? proc.pm2_env.cpu ?? 0;
      // Extract version from pm2_env (PM2 stores it when version_metadata is enabled)
      // Check pm2_env.version first, then fall back to env.VERSION
      const version = proc.pm2_env.version || proc.pm2_env.env?.VERSION || undefined;

      return {
        name: proc.name,
        status: proc.pm2_env.status || proc.status,
        uptime: Math.floor(uptime / 1000), // Convert to seconds
        memory: Math.floor(memory / 1024 / 1024), // Convert to MB
        cpu: cpu,
        restarts: proc.pm2_env.restart_time || 0,
        pm_id: proc.pm_id,
        version: version
      };
    });

    return NextResponse.json({ processes: status });
  } catch (err) {
    console.error("[pm2/status] Error getting PM2 status", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to get PM2 status: ${errorMessage}` },
      { status: 500 }
    );
  }
}
