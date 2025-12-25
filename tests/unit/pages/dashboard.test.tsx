import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import DashboardPage from "@/app/page";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockUseSession = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Simple render function without providers since we're mocking them
const render = (ui: React.ReactElement) => rtlRender(ui);

// Common test constants
const TEST_TIMEOUT = 2000;
const DEFAULT_AUTH_SESSION = {
  data: {
    user: {
      name: "Test User",
      email: "test@example.com",
      image: "https://example.com/avatar.png",
    },
  },
  status: "authenticated" as const,
};

const createEmptyFilesResponse = () => ({
  ok: true,
  json: async () => ({ files: [] }),
} as Response);

const createPM2StatusResponse = () => ({
  ok: true,
  json: async () => ({
    processes: [
      {
        name: "test-bot",
        status: "online",
        uptime: 3600,
        memory: 128,
        cpu: 2.5,
        restarts: 0,
        pm_id: 0,
        version: "1.2.0",
      },
    ],
  }),
} as Response);

// Helper to set up mocks for both backups and PM2 status APIs
// Maintains a queue of responses that can be consumed by mockResolvedValueOnce
let backupsResponseQueue: Response[] = [];
let pm2ResponseQueue: Response[] = [];

const setupMocks = (
  backupsResponse: Response,
  pm2Response: Response = createPM2StatusResponse()
) => {
  backupsResponseQueue.push(backupsResponse);
  pm2ResponseQueue.push(pm2Response);

  // Set up implementation that checks the queue
  mockFetch.mockImplementation((url: string | URL | Request) => {
    const urlString = typeof url === "string" ? url : url instanceof URL ? url.pathname : url.url;
    if (typeof urlString === "string") {
      if (urlString.includes("/api/pm2/status") && pm2ResponseQueue.length > 0) {
        return Promise.resolve(pm2ResponseQueue.shift()!);
      }
      if (urlString.includes("/api/backups/list") && backupsResponseQueue.length > 0) {
        return Promise.resolve(backupsResponseQueue.shift()!);
      }
    }
    // If queue is empty or URL doesn't match, let other mocks handle it
    return Promise.reject(new Error(`Unmocked fetch call to: ${urlString}`));
  });
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue(DEFAULT_AUTH_SESSION as never);
    // Reset queues
    backupsResponseQueue = [];
    pm2ResponseQueue = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the BackupManager component", async () => {
    setupMocks(createEmptyFilesResponse());

    render(<DashboardPage />);

    expect(screen.getByText("Nightscout Backup Dashboard")).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: TEST_TIMEOUT });
  });

  it("renders the PM2Status component", async () => {
    setupMocks(createEmptyFilesResponse());

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Discord Bot Status")).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("renders both BackupManager and PM2Status components together", async () => {
    setupMocks(createEmptyFilesResponse());

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Nightscout Backup Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Discord Bot Status")).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("has the correct layout structure", async () => {
    setupMocks(createEmptyFilesResponse());

    render(<DashboardPage />);

    // Check for main container
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass("px-6", "py-10", "sm:px-10");

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: TEST_TIMEOUT });
  });
});

