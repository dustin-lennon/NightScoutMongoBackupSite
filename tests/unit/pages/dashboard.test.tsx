import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// Mock data factories
const createMockFile = (
  filename: string,
  lastModified?: string,
  size?: number
) => ({
  key: `backups/${filename}`,
  ...(lastModified && { lastModified }),
  ...(size && { size }),
});

const createEmptyFilesResponse = () => ({
  ok: true,
  json: async () => ({ files: [] }),
} as Response);

const createFilesResponse = (files: Array<{ key: string; lastModified?: string; size?: number }>) => ({
  ok: true,
  json: async () => ({ files }),
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

// Common mock files
const SINGLE_MOCK_FILE = [
  createMockFile("dexcom_20250101.tar.gz", "2025-01-01T00:00:00Z", 1048576),
];

const MULTIPLE_MOCK_FILES = [
  createMockFile("dexcom_20250101.tar.gz", "2025-01-01T00:00:00Z", 1048576),
  createMockFile("dexcom_20250102.tar.gz", "2025-01-02T00:00:00Z", 2097152),
];

// Helper functions
const waitForElement = async (text: string | RegExp, timeout = TEST_TIMEOUT) => {
  await waitFor(
    () => {
      expect(screen.getByText(text)).toBeInTheDocument();
    },
    { timeout }
  );
};

const renderAndWaitForFetch = async () => {
  render(<DashboardPage />);
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalled();
  }, { timeout: TEST_TIMEOUT });
};

const setupUser = () => userEvent.setup();

const waitForFileToAppear = async (filename: string) => {
  await waitForElement(filename, TEST_TIMEOUT);
};

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

  it("renders the dashboard title", async () => {
    setupMocks(createEmptyFilesResponse());

    render(<DashboardPage />);

    expect(screen.getByText("Nightscout Backup Dashboard")).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: TEST_TIMEOUT });
  });

  it("displays empty state when no backups exist", async () => {
    setupMocks(createEmptyFilesResponse());

    render(<DashboardPage />);

    await waitForElement(/no backups found yet/i);
  });

  it("displays backup files in table", async () => {
    setupMocks(createFilesResponse(MULTIPLE_MOCK_FILES));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("dexcom_20250101.tar.gz")).toBeInTheDocument();
      expect(screen.getByText("dexcom_20250102.tar.gz")).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("shows error message when fetch fails", async () => {
    setupMocks(createEmptyFilesResponse());
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<DashboardPage />);

    await waitForElement(/network error/i);
  });

  it("creates backup when button is clicked", async () => {
    setupMocks(createEmptyFilesResponse());
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Backup triggered." }),
      } as Response);
    setupMocks(createEmptyFilesResponse()); // For refresh after create

    await renderAndWaitForFetch();

    await waitForElement(/create backup/i);

    const createButton = screen.getByText(/create backup/i);
    const user = setupUser();
    await user.click(createButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/backups/create", {
        method: "POST",
      });
    }, { timeout: TEST_TIMEOUT });
  });

  it("shows delete confirmation modal when delete button is clicked", async () => {
    setupMocks(createFilesResponse(SINGLE_MOCK_FILE));

    render(<DashboardPage />);
    await waitForFileToAppear("dexcom_20250101.tar.gz");

    const deleteButton = screen.getByText("Delete");
    const user = setupUser();
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("Confirm Delete")).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("cancels delete when cancel button is clicked", async () => {
    setupMocks(createFilesResponse(SINGLE_MOCK_FILE));

    render(<DashboardPage />);
    await waitForFileToAppear("dexcom_20250101.tar.gz");

    const user = setupUser();
    const deleteButton = screen.getByText("Delete");
    await user.click(deleteButton);

    await waitForElement("Confirm Delete");

    const cancelButton = screen.getByText("Cancel");
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("Confirm Delete")).not.toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("deletes backup when confirmed", async () => {
    setupMocks(createFilesResponse(SINGLE_MOCK_FILE));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Backup deleted successfully." }),
    } as Response);
    setupMocks(createEmptyFilesResponse()); // For refresh after delete

    render(<DashboardPage />);
    await waitForFileToAppear("dexcom_20250101.tar.gz");

    const user = setupUser();
    const deleteButtons = screen.getAllByText("Delete");
    const tableDeleteButton = deleteButtons[0];
    await user.click(tableDeleteButton);

    await waitForElement("Confirm Delete");

    const confirmDeleteButtons = screen.getAllByText("Delete");
    const modalDeleteButton = confirmDeleteButtons.find(
      (btn) => btn.closest('[class*="rounded-lg"]') !== null
    ) || confirmDeleteButtons[confirmDeleteButtons.length - 1];
    await user.click(modalDeleteButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/backups/delete?key="),
        { method: "DELETE" }
      );
    }, { timeout: TEST_TIMEOUT });
  });

  it("handles files with missing lastModified and size", async () => {
    const mockFiles = [createMockFile("dexcom_20250101.tar.gz")];

    setupMocks(createFilesResponse(mockFiles));

    render(<DashboardPage />);
    await waitForFileToAppear("dexcom_20250101.tar.gz");

    const cells = screen.getAllByText("—");
    expect(cells.length).toBeGreaterThan(0);
  });

  it("refreshes backups when refresh button is clicked", async () => {
    setupMocks(createEmptyFilesResponse()); // Initial load
    setupMocks(createEmptyFilesResponse()); // Refresh call (both APIs)

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/refresh/i).length).toBeGreaterThan(0);
    }, { timeout: TEST_TIMEOUT });

    // Click the backups refresh button (first one in header, near "Create backup")
    const refreshButtons = screen.getAllByText(/refresh/i);
    const backupsRefreshButton = refreshButtons[0]; // First one is in the header
    const user = setupUser();
    await user.click(backupsRefreshButton);

    await waitFor(() => {
      // Initial: backups/list + pm2/status = 2 calls
      // After refresh click: backups/list = 1 more call
      // Total should be at least 3
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, { timeout: TEST_TIMEOUT });
  });

  it("handles backup creation with message and stats", async () => {
    setupMocks(createEmptyFilesResponse());
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: "Backup created successfully and uploaded to S3.",
        url: "https://s3-url",
        stats: { collections: 5 },
      }),
    } as Response);
    setupMocks(createEmptyFilesResponse()); // For refresh after create

    await renderAndWaitForFetch();

    await waitForElement(/create backup/i);

    const createButton = screen.getByText(/create backup/i);
    const user = setupUser();
    await user.click(createButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/backups/create", {
        method: "POST",
      });
      expect(mockFetch).toHaveBeenCalledWith("/api/backups/list");
    }, { timeout: 3000 });
  });
});

