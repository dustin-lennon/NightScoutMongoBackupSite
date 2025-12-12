import { describe, it, expect, vi, beforeEach } from "vitest";

// Use hoisted to ensure mocks are set up before module loads
const mockExecAsync = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    exec: vi.fn(),
  };
});

vi.mock("node:util", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:util")>();
  return {
    ...actual,
    promisify: vi.fn(() => mockExecAsync),
  };
});

// Import route after mocks
import { GET } from "@/app/api/pm2/status/route";

describe("GET /api/pm2/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns PM2 bot process status", async () => {
    const mockPM2Output = JSON.stringify([
      {
        name: "nightscout-backup-bot",
        pm_id: 0,
        status: "online",
        pm2_env: {
          status: "online",
          pm_uptime: Date.now() - 3600000, // 1 hour ago
          restart_time: 0,
          version: "1.2.0",
        },
        monit: {
          memory: 134217728, // 128 MB
          cpu: 2.5,
        },
      },
    ]);

    mockExecAsync.mockResolvedValueOnce({
      stdout: mockPM2Output,
      stderr: "",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processes).toHaveLength(1);
    expect(data.processes[0].name).toBe("nightscout-backup-bot");
    expect(data.processes[0].status).toBe("online");
    expect(data.processes[0].version).toBe("1.2.0");
    expect(data.processes[0].memory).toBe(128);
    expect(data.processes[0].cpu).toBe(2.5);
    expect(data.processes[0].restarts).toBe(0);
  });

  it("filters only bot processes", async () => {
    const mockPM2Output = JSON.stringify([
      {
        name: "nightscout-backup-bot",
        pm_id: 0,
        status: "online",
        pm2_env: {
          status: "online",
          pm_uptime: Date.now() - 3600000,
          restart_time: 0,
        },
        monit: {
          memory: 134217728,
          cpu: 2.5,
        },
      },
      {
        name: "nightscout-backup-site",
        pm_id: 1,
        status: "online",
        pm2_env: {
          status: "online",
          pm_uptime: Date.now() - 3600000,
          restart_time: 0,
        },
        monit: {
          memory: 268435456,
          cpu: 1.0,
        },
      },
    ]);

    mockExecAsync.mockResolvedValueOnce({
      stdout: mockPM2Output,
      stderr: "",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processes).toHaveLength(1);
    expect(data.processes[0].name).toBe("nightscout-backup-bot");
  });

  it("returns 404 when no bot processes found", async () => {
    const mockPM2Output = JSON.stringify([
      {
        name: "nightscout-backup-site",
        pm_id: 0,
        status: "online",
        pm2_env: {
          status: "online",
          pm_uptime: Date.now() - 3600000,
          restart_time: 0,
        },
        monit: {
          memory: 268435456,
          cpu: 1.0,
        },
      },
    ]);

    mockExecAsync.mockResolvedValueOnce({
      stdout: mockPM2Output,
      stderr: "",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("No Discord bot process found");
  });

  it("handles version from environment variable", async () => {
    const mockPM2Output = JSON.stringify([
      {
        name: "test-bot",
        pm_id: 0,
        status: "online",
        pm2_env: {
          status: "online",
          pm_uptime: Date.now() - 3600000,
          restart_time: 0,
          env: {
            VERSION: "1.3.0",
          },
        },
        monit: {
          memory: 134217728,
          cpu: 2.5,
        },
      },
    ]);

    mockExecAsync.mockResolvedValueOnce({
      stdout: mockPM2Output,
      stderr: "",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processes[0].version).toBe("1.3.0");
  });

  it("handles missing version gracefully", async () => {
    const mockPM2Output = JSON.stringify([
      {
        name: "test-bot",
        pm_id: 0,
        status: "online",
        pm2_env: {
          status: "online",
          pm_uptime: Date.now() - 3600000,
          restart_time: 0,
        },
        monit: {
          memory: 134217728,
          cpu: 2.5,
        },
      },
    ]);

    mockExecAsync.mockResolvedValueOnce({
      stdout: mockPM2Output,
      stderr: "",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processes[0].version).toBeUndefined();
  });

  it("calculates uptime correctly", async () => {
    const oneHourAgo = Date.now() - 3600000;
    const mockPM2Output = JSON.stringify([
      {
        name: "test-bot",
        pm_id: 0,
        status: "online",
        pm2_env: {
          status: "online",
          pm_uptime: oneHourAgo,
          restart_time: 0,
        },
        monit: {
          memory: 134217728,
          cpu: 2.5,
        },
      },
    ]);

    mockExecAsync.mockResolvedValueOnce({
      stdout: mockPM2Output,
      stderr: "",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    // Uptime should be approximately 3600 seconds (1 hour)
    expect(data.processes[0].uptime).toBeGreaterThanOrEqual(3590);
    expect(data.processes[0].uptime).toBeLessThanOrEqual(3610);
  });

  it("converts memory to MB correctly", async () => {
    const mockPM2Output = JSON.stringify([
      {
        name: "test-bot",
        pm_id: 0,
        status: "online",
        pm2_env: {
          status: "online",
          pm_uptime: Date.now() - 3600000,
          restart_time: 0,
        },
        monit: {
          memory: 268435456, // 256 MB
          cpu: 2.5,
        },
      },
    ]);

    mockExecAsync.mockResolvedValueOnce({
      stdout: mockPM2Output,
      stderr: "",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processes[0].memory).toBe(256);
  });

  it("handles PM2 command failure", async () => {
    mockExecAsync.mockRejectedValueOnce(new Error("PM2 command failed"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to get PM2 status");
  });

  it("handles invalid JSON from PM2", async () => {
    mockExecAsync.mockResolvedValueOnce({
      stdout: "invalid json",
      stderr: "",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to get PM2 status");
  });

  it("handles multiple bot processes", async () => {
    const mockPM2Output = JSON.stringify([
      {
        name: "bot-1",
        pm_id: 0,
        status: "online",
        pm2_env: {
          status: "online",
          pm_uptime: Date.now() - 3600000,
          restart_time: 0,
        },
        monit: {
          memory: 134217728,
          cpu: 2.5,
        },
      },
      {
        name: "bot-2",
        pm_id: 1,
        status: "online",
        pm2_env: {
          status: "online",
          pm_uptime: Date.now() - 7200000,
          restart_time: 1,
        },
        monit: {
          memory: 268435456,
          cpu: 1.0,
        },
      },
    ]);

    mockExecAsync.mockResolvedValueOnce({
      stdout: mockPM2Output,
      stderr: "",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processes).toHaveLength(2);
    expect(data.processes[0].name).toBe("bot-1");
    expect(data.processes[1].name).toBe("bot-2");
  });

  it("handles stderr output", async () => {
    const mockPM2Output = JSON.stringify([
      {
        name: "test-bot",
        pm_id: 0,
        status: "online",
        pm2_env: {
          status: "online",
          pm_uptime: Date.now() - 3600000,
          restart_time: 0,
        },
        monit: {
          memory: 134217728,
          cpu: 2.5,
        },
      },
    ]);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockExecAsync.mockResolvedValueOnce({
      stdout: mockPM2Output,
      stderr: "Warning: some warning",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[pm2/status] PM2 stderr:"),
      "Warning: some warning"
    );

    consoleErrorSpy.mockRestore();
  });
});
