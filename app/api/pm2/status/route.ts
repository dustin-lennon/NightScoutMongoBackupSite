import { NextResponse } from "next/server";
import { createMethodHandlers } from "@/lib/api-utils";

// Force this route to run on Node.js runtime (not edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PM2 must be imported dynamically and only on the server side
// It cannot be bundled by Next.js as it contains shell scripts
// Using dynamic import prevents Next.js from trying to bundle it

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

// PM2 Process Description type - using any to avoid type conflicts with PM2's internal types
// We safely access properties and handle undefined cases
type PM2ProcessDescription = {
  name?: string;
  pm_id?: number;
  pm2_env?: {
    status?: string;
    pm_uptime?: number;
    restart_time?: number;
    used_memory?: number;
    version?: string;
    env?: Record<string, unknown>;
    [key: string]: unknown;
  };
  monit?: {
    memory?: number;
    cpu?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/**
 * Connect to PM2 daemon and get process list using programmatic API.
 * This is more secure than shell command execution as it eliminates
 * command injection risks.
 */
async function connectToPM2(): Promise<void> {
  // Dynamic import prevents Next.js from bundling PM2
  const pm2 = await import("pm2");
  return new Promise((resolve, reject) => {
    pm2.default.connect((err: Error | null) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get PM2 process list using programmatic API.
 */
async function listPM2Processes(): Promise<PM2ProcessDescription[]> {
  // Dynamic import prevents Next.js from bundling PM2
  const pm2 = await import("pm2");
  return new Promise((resolve, reject) => {
    pm2.default.list((err: Error | null, list: unknown) => {
      if (err) {
        reject(err);
      } else {
        // Type assertion - PM2 returns ProcessDescription[] which we cast to our type
        // This is safe because we handle all properties defensively
        resolve((list as PM2ProcessDescription[]) || []);
      }
    });
  });
}

/**
 * Disconnect from PM2 daemon.
 */
async function disconnectFromPM2(): Promise<void> {
  try {
    // Dynamic import prevents Next.js from bundling PM2
    const pm2 = await import("pm2");
    pm2.default.disconnect();
  } catch {
    // Ignore errors if PM2 wasn't connected
  }
}

// Security: Explicitly handle unsupported HTTP methods
const methodHandlers = createMethodHandlers("GET");
export const POST = methodHandlers.POST;
export const PUT = methodHandlers.PUT;
export const PATCH = methodHandlers.PATCH;
export const DELETE = methodHandlers.DELETE;

export async function GET() {
  let pm2Connected = false;
  try {
    // Check if PM2 is available (it might not be in all environments)
    try {
      // Try to import PM2 - if this fails, PM2 is not available
      await import("pm2");
    } catch (importError) {
      console.error("[pm2/status] PM2 module not available", importError);
      return NextResponse.json(
        { error: "PM2 is not available in this environment" },
        { status: 503 }
      );
    }

    // Connect to PM2 daemon using programmatic API (no shell execution)
    await connectToPM2();
    pm2Connected = true;

    // Get process list
    const processes = await listPM2Processes();

    // Disconnect from PM2
    await disconnectFromPM2();
    pm2Connected = false;

    // Filter for Discord bot (assuming it's named something like "nightscout-backup-bot" or contains "bot")
    const botProcesses = processes.filter((proc) =>
      proc.name?.toLowerCase().includes("bot")
    );

    if (botProcesses.length === 0) {
      return NextResponse.json(
        { error: "No Discord bot process found in PM2" },
        { status: 404 }
      );
    }

    // Map to our response format
    const status: PM2Process[] = botProcesses.map((proc) => {
      const pm2Env = proc.pm2_env || {};
      const monit = proc.monit || {};
      const uptime = pm2Env.pm_uptime 
        ? Date.now() - pm2Env.pm_uptime 
        : 0;
      const memory = monit.memory || pm2Env.used_memory || 0;
      const cpu = monit.cpu || 0;
      
      // Extract version from pm2_env (PM2 stores it when version_metadata is enabled)
      // Check pm2_env.version first, then fall back to env.VERSION
      const version = pm2Env.version || 
                     (pm2Env.env && typeof pm2Env.env === 'object' && 'VERSION' in pm2Env.env 
                       ? String(pm2Env.env.VERSION) 
                       : undefined);

      return {
        name: proc.name || "unknown",
        status: pm2Env.status || proc.pm_id ? "online" : "stopped",
        uptime: Math.floor(uptime / 1000), // Convert to seconds
        memory: Math.floor(memory / 1024 / 1024), // Convert to MB
        cpu: cpu,
        restarts: pm2Env.restart_time || 0,
        pm_id: proc.pm_id || 0,
        version: version
      };
    });

    return NextResponse.json({ processes: status });
  } catch (err) {
    // Ensure we disconnect even on error
    if (pm2Connected) {
      try {
        await disconnectFromPM2();
      } catch {
        // Ignore disconnect errors
      }
    }

    console.error("[pm2/status] Error getting PM2 status", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    // Log the full error for debugging
    console.error("[pm2/status] Full error details:", {
      message: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      name: err instanceof Error ? err.name : typeof err
    });
    
    return NextResponse.json(
      { error: `Failed to get PM2 status: ${errorMessage}` },
      { status: 500 }
    );
  }
}
