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

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Test User",
          email: "test@example.com",
          image: "https://example.com/avatar.png",
        },
      },
      status: "authenticated",
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the dashboard title", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: [] }),
    } as Response);

    render(<DashboardPage />);

    expect(screen.getByText("Nightscout Backup Dashboard")).toBeInTheDocument();
    
    // Wait for any async state updates to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it("displays empty state when no backups exist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: [] }),
    } as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/no backups found yet/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("displays backup files in table", async () => {
    const mockFiles = [
      {
        key: "backups/dexcom_20250101.tar.gz",
        lastModified: "2025-01-01T00:00:00Z",
        size: 1048576, // 1MB
      },
      {
        key: "backups/dexcom_20250102.tar.gz",
        lastModified: "2025-01-02T00:00:00Z",
        size: 2097152, // 2MB
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: mockFiles }),
    } as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("dexcom_20250101.tar.gz")).toBeInTheDocument();
      expect(screen.getByText("dexcom_20250102.tar.gz")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("shows error message when fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("creates backup when button is clicked", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Backup triggered." }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      } as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/create backup/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    const createButton = screen.getByText(/create backup/i);
    const user = userEvent.setup();
    await user.click(createButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/backups/create", {
        method: "POST",
      });
    }, { timeout: 2000 });
  });

  it("shows delete confirmation modal when delete button is clicked", async () => {
    const mockFiles = [
      {
        key: "backups/dexcom_20250101.tar.gz",
        lastModified: "2025-01-01T00:00:00Z",
        size: 1048576,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: mockFiles }),
    } as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("dexcom_20250101.tar.gz")).toBeInTheDocument();
    }, { timeout: 2000 });

    const deleteButton = screen.getByText("Delete");
    const user = userEvent.setup();
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("Confirm Delete")).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("cancels delete when cancel button is clicked", async () => {
    const mockFiles = [
      {
        key: "backups/dexcom_20250101.tar.gz",
        lastModified: "2025-01-01T00:00:00Z",
        size: 1048576,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: mockFiles }),
    } as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("dexcom_20250101.tar.gz")).toBeInTheDocument();
    }, { timeout: 2000 });

    const user = userEvent.setup();
    const deleteButton = screen.getByText("Delete");
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("Confirm Delete")).toBeInTheDocument();
    }, { timeout: 2000 });

    const cancelButton = screen.getByText("Cancel");
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("Confirm Delete")).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("deletes backup when confirmed", async () => {
    const mockFiles = [
      {
        key: "backups/dexcom_20250101.tar.gz",
        lastModified: "2025-01-01T00:00:00Z",
        size: 1048576,
      },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: mockFiles }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Backup deleted successfully." }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      } as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("dexcom_20250101.tar.gz")).toBeInTheDocument();
    }, { timeout: 2000 });

    const user = userEvent.setup();
    // Get the delete button from the table row (not the modal)
    const deleteButtons = screen.getAllByText("Delete");
    const tableDeleteButton = deleteButtons[0]; // First one is in the table
    await user.click(tableDeleteButton);

    await waitFor(() => {
      expect(screen.getByText("Confirm Delete")).toBeInTheDocument();
    }, { timeout: 2000 });

    // Get the confirm delete button from the modal
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
    }, { timeout: 2000 });
  });

  it("handles files with missing lastModified and size", async () => {
    const mockFiles = [
      {
        key: "backups/dexcom_20250101.tar.gz",
        // Missing lastModified and size
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: mockFiles }),
    } as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("dexcom_20250101.tar.gz")).toBeInTheDocument();
    }, { timeout: 2000 });

    // Should show "—" for missing values
    const cells = screen.getAllByText("—");
    expect(cells.length).toBeGreaterThan(0);
  });

  it("refreshes backups when refresh button is clicked", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      } as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/refresh/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    const refreshButton = screen.getByText(/refresh/i);
    const user = userEvent.setup();
    await user.click(refreshButton);

    await waitFor(() => {
      // Should have been called twice: initial load + refresh
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, { timeout: 2000 });
  });

  it("handles backup creation with message and stats", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: "Backup created successfully and uploaded to S3.",
          url: "https://s3-url",
          stats: { collections: 5 },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      } as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/create backup/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    const createButton = screen.getByText(/create backup/i);
    const user = userEvent.setup();
    await user.click(createButton);

    // Verify the backup API was called and then the list was refreshed
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/backups/create", {
        method: "POST",
      });
      // Should have called list API twice: initial load + after backup
      expect(mockFetch).toHaveBeenCalledWith("/api/backups/list");
    }, { timeout: 3000 });
  });
});

