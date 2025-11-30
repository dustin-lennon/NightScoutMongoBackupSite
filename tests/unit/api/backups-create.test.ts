import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/backups/create/route";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("POST /api/backups/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PYTHON_BACKUP_API_URL = "http://localhost:8000";
  });

  it("successfully triggers backup", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        url: "https://s3-url",
        stats: { collections: "5" },
      }),
    } as Response);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("Backup created successfully");
    expect(data.url).toBe("https://s3-url");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/backup",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
    );
  });

  it("returns 500 when Python API fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal server error",
    } as Response);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Backup failed");
  });

  it("returns 500 when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to connect to backup service");
  });

  it("returns 500 when backup reports failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
      }),
    } as Response);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Backup completed but reported failure");
  });

  it("uses relative URL when PYTHON_BACKUP_API_URL is not set", async () => {
    // Reset modules to test with no PYTHON_BACKUP_API_URL
    vi.resetModules();
    delete process.env.PYTHON_BACKUP_API_URL;
    
    // Re-import the route
    const { POST: POSTWithoutUrl } = await import("@/app/api/backups/create/route");
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        url: "https://s3-url",
      }),
    } as Response);

    const response = await POSTWithoutUrl();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      "/backup",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
    );
    expect(data.url).toBe("https://s3-url");
    
    // Restore for other tests
    process.env.PYTHON_BACKUP_API_URL = "http://localhost:8000";
  });
});

