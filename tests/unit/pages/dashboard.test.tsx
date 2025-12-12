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

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue(DEFAULT_AUTH_SESSION as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the dashboard title", async () => {
    mockFetch
      .mockResolvedValueOnce(createEmptyFilesResponse())
      .mockResolvedValueOnce(createPM2StatusResponse());

    render(<DashboardPage />);

    expect(screen.getByText("Nightscout Backup Dashboard")).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: TEST_TIMEOUT });
  });

  it("displays empty state when no backups exist", async () => {
    mockFetch
      .mockResolvedValueOnce(createEmptyFilesResponse())
      .mockResolvedValueOnce(createPM2StatusResponse());

    render(<DashboardPage />);

    await waitForElement(/no backups found yet/i);
  });

  it("displays backup files in table", async () => {
    mockFetch
      .mockResolvedValueOnce(createFilesResponse(MULTIPLE_MOCK_FILES))
      .mockResolvedValueOnce(createPM2StatusResponse());

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("dexcom_20250101.tar.gz")).toBeInTheDocument();
      expect(screen.getByText("dexcom_20250102.tar.gz")).toBeInTheDocument();
    }, { timeout: TEST_TIMEOUT });
  });

  it("shows error message when fetch fails", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(createPM2StatusResponse());

    render(<DashboardPage />);

    await waitForElement(/network error/i);
  });

  it("creates backup when button is clicked", async () => {
    mockFetch
      .mockResolvedValueOnce(createEmptyFilesResponse())
      .mockResolvedValueOnce(createPM2StatusResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Backup triggered." }),
      } as Response)
      .mockResolvedValueOnce(createEmptyFilesResponse())
      .mockResolvedValueOnce(createPM2StatusResponse());

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
    mockFetch
      .mockResolvedValueOnce(createFilesResponse(SINGLE_MOCK_FILE))
      .mockResolvedValueOnce(createPM2StatusResponse());

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
    mockFetch
      .mockResolvedValueOnce(createFilesResponse(SINGLE_MOCK_FILE))
      .mockResolvedValueOnce(createPM2StatusResponse());

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
    mockFetch
      .mockResolvedValueOnce(createFilesResponse(SINGLE_MOCK_FILE))
      .mockResolvedValueOnce(createPM2StatusResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Backup deleted successfully." }),
      } as Response)
      .mockResolvedValueOnce(createEmptyFilesResponse())
      .mockResolvedValueOnce(createPM2StatusResponse());

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

    mockFetch
      .mockResolvedValueOnce(createFilesResponse(mockFiles))
      .mockResolvedValueOnce(createPM2StatusResponse());

    render(<DashboardPage />);
    await waitForFileToAppear("dexcom_20250101.tar.gz");

    const cells = screen.getAllByText("—");
    expect(cells.length).toBeGreaterThan(0);
  });

  it("refreshes backups when refresh button is clicked", async () => {
    mockFetch
      .mockResolvedValueOnce(createEmptyFilesResponse())
      .mockResolvedValueOnce(createPM2StatusResponse())
      .mockResolvedValueOnce(createEmptyFilesResponse())
      .mockResolvedValueOnce(createPM2StatusResponse());

    render(<DashboardPage />);
    await waitForElement(/refresh/i);

    const refreshButton = screen.getByText(/refresh/i);
    const user = setupUser();
    await user.click(refreshButton);

    await waitFor(() => {
      // Should be called at least 2 times (initial load + refresh)
      expect(mockFetch).toHaveBeenCalledTimes(4);
    }, { timeout: TEST_TIMEOUT });
  });

  it("handles backup creation with message and stats", async () => {
    mockFetch
      .mockResolvedValueOnce(createEmptyFilesResponse())
      .mockResolvedValueOnce(createPM2StatusResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: "Backup created successfully and uploaded to S3.",
          url: "https://s3-url",
          stats: { collections: 5 },
        }),
      } as Response)
      .mockResolvedValueOnce(createEmptyFilesResponse())
      .mockResolvedValueOnce(createPM2StatusResponse());

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

