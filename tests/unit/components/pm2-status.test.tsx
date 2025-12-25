import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render as rtlRender, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PM2Status from "@/components/pm2-status";

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Simple render function
const render = (ui: React.ReactElement) => rtlRender(ui);

const TEST_TIMEOUT = 2000;

const createPM2StatusResponse = (processes: Array<{
  name: string;
  status: string;
  uptime: number;
  memory: number;
  cpu: number;
  restarts: number;
  pm_id: number;
  version?: string;
}>) => ({
  ok: true,
  json: async () => ({ processes }),
} as Response);

const createErrorResponse = (error: string) => ({
  ok: false,
  json: async () => ({ error }),
} as Response);

// Note: Some tests are skipped due to async timing issues with useEffect and timers
// The component functionality is tested via E2E tests
describe("PM2Status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the Discord Bot Status header", async () => {
    mockFetch.mockResolvedValueOnce(createPM2StatusResponse([]));

    await act(async () => {
      render(<PM2Status />);
    });

    // Wait for the fetch to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    expect(screen.getByText("Discord Bot Status")).toBeInTheDocument();
  });

  it("displays empty state when no bot processes found", async () => {
    mockFetch.mockResolvedValueOnce(createPM2StatusResponse([]));

    render(<PM2Status />);

    await waitFor(() => {
      expect(screen.getByText(/no discord bot processes found in pm2/i)).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("displays bot process information", async () => {
    const mockProcess = {
      name: "nightscout-backup-bot",
      status: "online",
      uptime: 3600, // 1 hour
      memory: 128,
      cpu: 2.5,
      restarts: 0,
      pm_id: 0,
      version: "1.2.0",
    };

    mockFetch.mockResolvedValueOnce(createPM2StatusResponse([mockProcess]));

    render(<PM2Status />);

    await waitFor(() => {
      expect(screen.getByText("nightscout-backup-bot")).toBeInTheDocument();
      expect(screen.getByText("online")).toBeInTheDocument();
      expect(screen.getByText("v1.2.0")).toBeInTheDocument();
      expect(screen.getByText("128 MB")).toBeInTheDocument();
      expect(screen.getByText("2.5%")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("formats uptime correctly with days", async () => {
    const mockProcess = {
      name: "test-bot",
      status: "online",
      uptime: 90061, // 1 day, 1 hour, 1 minute, 1 second
      memory: 64,
      cpu: 1.0,
      restarts: 0,
      pm_id: 0,
    };

    mockFetch.mockResolvedValueOnce(createPM2StatusResponse([mockProcess]));

    render(<PM2Status />);

    await waitFor(() => {
      expect(screen.getByText("test-bot")).toBeInTheDocument();
      // Should display formatted uptime (1d 1h 1m)
      const uptimeElement = screen.getByText(/1d 1h 1m/i);
      expect(uptimeElement).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("formats uptime correctly with hours only", async () => {
    const mockProcess = {
      name: "test-bot",
      status: "online",
      uptime: 3661, // 1 hour, 1 minute, 1 second
      memory: 64,
      cpu: 1.0,
      restarts: 0,
      pm_id: 0,
    };

    mockFetch.mockResolvedValueOnce(createPM2StatusResponse([mockProcess]));

    render(<PM2Status />);

    await waitFor(() => {
      expect(screen.getByText("test-bot")).toBeInTheDocument();
      // Should display formatted uptime (1h 1m 1s)
      const uptimeElement = screen.getByText(/1h 1m 1s/i);
      expect(uptimeElement).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("formats uptime correctly with minutes only", async () => {
    const mockProcess = {
      name: "test-bot",
      status: "online",
      uptime: 61, // 1 minute, 1 second
      memory: 64,
      cpu: 1.0,
      restarts: 0,
      pm_id: 0,
    };

    mockFetch.mockResolvedValueOnce(createPM2StatusResponse([mockProcess]));

    render(<PM2Status />);

    await waitFor(() => {
      expect(screen.getByText("test-bot")).toBeInTheDocument();
      // Should display formatted uptime (1m 1s)
      const uptimeElement = screen.getByText(/1m 1s/i);
      expect(uptimeElement).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("formats uptime correctly with seconds only", async () => {
    const mockProcess = {
      name: "test-bot",
      status: "online",
      uptime: 5, // 5 seconds
      memory: 64,
      cpu: 1.0,
      restarts: 0,
      pm_id: 0,
    };

    mockFetch.mockResolvedValueOnce(createPM2StatusResponse([mockProcess]));

    render(<PM2Status />);

    await waitFor(() => {
      expect(screen.getByText("test-bot")).toBeInTheDocument();
      // Should display formatted uptime (5s)
      const uptimeElement = screen.getByText(/5s/i);
      expect(uptimeElement).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("displays error message when API fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<PM2Status />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("displays error message when API returns error response", async () => {
    mockFetch.mockResolvedValueOnce(createErrorResponse("Failed to load PM2 status"));

    render(<PM2Status />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load pm2 status/i)).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("displays default error message when API returns error without message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    render(<PM2Status />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load pm2 status/i)).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("refreshes status when refresh button is clicked", async () => {
    const mockProcess = {
      name: "test-bot",
      status: "online",
      uptime: 3600,
      memory: 64,
      cpu: 1.0,
      restarts: 0,
      pm_id: 0,
    };

    mockFetch
      .mockResolvedValueOnce(createPM2StatusResponse([mockProcess]))
      .mockResolvedValueOnce(createPM2StatusResponse([mockProcess]));

    render(<PM2Status />);

    await waitFor(() => {
      expect(screen.getByText("test-bot")).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });

    const refreshButton = screen.getByText("Refresh");
    const user = userEvent.setup({ delay: null });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, { timeout: TEST_TIMEOUT });
  });

  it.skip("auto-refreshes every 30 seconds", async () => {
    vi.useFakeTimers();
    const mockProcess = {
      name: "test-bot",
      status: "online",
      uptime: 3600,
      memory: 64,
      cpu: 1.0,
      restarts: 0,
      pm_id: 0,
    };

    mockFetch.mockResolvedValue(createPM2StatusResponse([mockProcess]));

    render(<PM2Status />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    }, { timeout: TEST_TIMEOUT });

    // Advance timer by 30 seconds
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, { timeout: TEST_TIMEOUT });

    vi.useRealTimers();
  });

  it("displays status badge with correct color for online status", async () => {
    const mockProcess = {
      name: "test-bot",
      status: "online",
      uptime: 3600,
      memory: 64,
      cpu: 1.0,
      restarts: 0,
      pm_id: 0,
    };

    mockFetch.mockResolvedValueOnce(createPM2StatusResponse([mockProcess]));

    render(<PM2Status />);

    await waitFor(() => {
      const statusBadge = screen.getByText("online");
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass("bg-emerald-50");
    }, { timeout: TEST_TIMEOUT });
  });

  it("displays status badge with correct color for stopped status", async () => {
    const mockProcess = {
      name: "test-bot",
      status: "stopped",
      uptime: 0,
      memory: 0,
      cpu: 0,
      restarts: 0,
      pm_id: 0,
    };

    mockFetch.mockResolvedValueOnce(createPM2StatusResponse([mockProcess]));

    render(<PM2Status />);

    await waitFor(() => {
      const statusBadge = screen.getByText("stopped");
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass("bg-red-50");
    }, { timeout: TEST_TIMEOUT });
  });

  it("displays status badge with correct color for errored status", async () => {
    const mockProcess = {
      name: "test-bot",
      status: "errored",
      uptime: 0,
      memory: 0,
      cpu: 0,
      restarts: 0,
      pm_id: 0,
    };

    mockFetch.mockResolvedValueOnce(createPM2StatusResponse([mockProcess]));

    render(<PM2Status />);

    await waitFor(() => {
      const statusBadge = screen.getByText("errored");
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass("bg-red-100");
    }, { timeout: TEST_TIMEOUT });
  });

  it("displays status badge with correct color for restarting status", async () => {
    const mockProcess = {
      name: "test-bot",
      status: "restarting",
      uptime: 0,
      memory: 0,
      cpu: 0,
      restarts: 0,
      pm_id: 0,
    };

    mockFetch.mockResolvedValueOnce(createPM2StatusResponse([mockProcess]));

    render(<PM2Status />);

    await waitFor(() => {
      const statusBadge = screen.getByText("restarting");
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass("bg-yellow-50");
    }, { timeout: TEST_TIMEOUT });
  });

  it("displays status badge with correct color for unknown status", async () => {
    const mockProcess = {
      name: "test-bot",
      status: "unknown-status",
      uptime: 0,
      memory: 0,
      cpu: 0,
      restarts: 0,
      pm_id: 0,
    };

    mockFetch.mockResolvedValueOnce(createPM2StatusResponse([mockProcess]));

    render(<PM2Status />);

    await waitFor(() => {
      const statusBadge = screen.getByText("unknown-status");
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass("bg-slate-50");
    }, { timeout: TEST_TIMEOUT });
  });

  it("handles process without version", async () => {
    const mockProcess = {
      name: "test-bot",
      status: "online",
      uptime: 3600,
      memory: 64,
      cpu: 1.0,
      restarts: 0,
      pm_id: 0,
    };

    mockFetch.mockResolvedValueOnce(createPM2StatusResponse([mockProcess]));

    render(<PM2Status />);

    await waitFor(() => {
      expect(screen.getByText("test-bot")).toBeInTheDocument();
      expect(screen.queryByText(/v\d+\.\d+\.\d+/)).not.toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("displays multiple bot processes", async () => {
    const mockProcesses = [
      {
        name: "bot-1",
        status: "online",
        uptime: 3600,
        memory: 64,
        cpu: 1.0,
        restarts: 0,
        pm_id: 0,
      },
      {
        name: "bot-2",
        status: "online",
        uptime: 7200,
        memory: 128,
        cpu: 2.0,
        restarts: 1,
        pm_id: 1,
      },
    ];

    mockFetch.mockResolvedValueOnce(createPM2StatusResponse(mockProcesses));

    render(<PM2Status />);

    await waitFor(() => {
      expect(screen.getByText("bot-1")).toBeInTheDocument();
      expect(screen.getByText("bot-2")).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("handles empty processes array", async () => {
    mockFetch.mockResolvedValueOnce(createPM2StatusResponse([]));

    render(<PM2Status />);

    await waitFor(() => {
      expect(screen.getByText(/no discord bot processes found in pm2/i)).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("handles null processes in response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ processes: null }),
    } as Response);

    render(<PM2Status />);

    await waitFor(() => {
      expect(screen.getByText(/no discord bot processes found in pm2/i)).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });
});



