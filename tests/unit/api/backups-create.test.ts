import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET, PUT, PATCH, DELETE } from "@/app/api/backups/create/route";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("POST /api/backups/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PYTHON_BACKUP_API_URL = "http://localhost:8000";
  });

  describe("Method handlers", () => {
    it("GET returns 405 Method Not Allowed", async () => {
      const response = await GET();
      const data = await response.json();
      expect(response.status).toBe(405);
      expect(data.error).toContain("Use POST");
    });

    it("PUT returns 405 Method Not Allowed", async () => {
      const response = await PUT();
      const data = await response.json();
      expect(response.status).toBe(405);
      expect(data.error).toContain("Use POST");
    });

    it("PATCH returns 405 Method Not Allowed", async () => {
      const response = await PATCH();
      const data = await response.json();
      expect(response.status).toBe(405);
      expect(data.error).toContain("Use POST");
    });

    it("DELETE returns 405 Method Not Allowed", async () => {
      const response = await DELETE();
      const data = await response.json();
      expect(response.status).toBe(405);
      expect(data.error).toContain("Use POST");
    });
  });

  describe("SSRF validation", () => {
    it("rejects external URLs", async () => {
      vi.resetModules();
      process.env.PYTHON_BACKUP_API_URL = "https://evil.com";
      
      const { POST: POSTWithEvilUrl } = await import("@/app/api/backups/create/route");
      const response = await POSTWithEvilUrl();
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toContain("Invalid backup API URL");
      expect(mockFetch).not.toHaveBeenCalled();
      
      // Restore
      process.env.PYTHON_BACKUP_API_URL = "http://localhost:8000";
    });

    it("allows localhost URLs", async () => {
      process.env.PYTHON_BACKUP_API_URL = "http://localhost:8000";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const response = await POST();
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("allows 127.0.0.1 URLs", async () => {
      vi.resetModules();
      process.env.PYTHON_BACKUP_API_URL = "http://127.0.0.1:8000";
      
      const { POST: POSTWith127 } = await import("@/app/api/backups/create/route");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const response = await POSTWith127();
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalled();
      
      // Restore
      process.env.PYTHON_BACKUP_API_URL = "http://localhost:8000";
    });

    it("allows relative URLs", async () => {
      vi.resetModules();
      delete process.env.PYTHON_BACKUP_API_URL;
      
      const { POST: POSTWithoutUrl } = await import("@/app/api/backups/create/route");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const response = await POSTWithoutUrl();
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        "/backup",
        expect.any(Object)
      );
      
      // Restore
      process.env.PYTHON_BACKUP_API_URL = "http://localhost:8000";
    });
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

  it("includes API key in headers when configured", async () => {
    vi.resetModules();
    process.env.PYTHON_BACKUP_API_URL = "http://localhost:8000";
    process.env.PYTHON_BACKUP_API_KEY = "test-api-key";
    
    const { POST: POSTWithKey } = await import("@/app/api/backups/create/route");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await POSTWithKey();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      })
    );
    
    // Restore
    delete process.env.PYTHON_BACKUP_API_KEY;
  });

  it("does not include API key when not configured", async () => {
    delete process.env.PYTHON_BACKUP_API_KEY;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await POST();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.anything(),
        }),
      })
    );
  });
});

