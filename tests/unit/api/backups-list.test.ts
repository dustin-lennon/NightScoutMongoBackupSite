import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock before any imports
// eslint-disable-next-line @typescript-eslint/no-unused-vars
vi.mock("@aws-sdk/client-s3", () => {
  const mockSend = vi.fn();
  return {
    S3Client: vi.fn(() => ({
      send: mockSend,
    })),
    ListObjectsV2Command: vi.fn(),
    __testMockSend: mockSend, // Export it for testing
  };
});

// Set env vars before importing
process.env.BACKUP_S3_BUCKET = "test-bucket";
process.env.BACKUP_S3_PREFIX = "backups/";
process.env.AWS_REGION = "us-east-1";

// Import route after env vars are set
import { GET, POST, PUT, PATCH, DELETE } from "@/app/api/backups/list/route";

describe("GET /api/backups/list", () => {
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mock send function from the mocked module
    const mocked = await vi.importMock("@aws-sdk/client-s3");
    mockSend = (mocked as { __testMockSend: ReturnType<typeof vi.fn> }).__testMockSend;
    mockSend.mockReset();
    // Ensure env vars are set for each test
    process.env.BACKUP_S3_BUCKET = "test-bucket";
    process.env.BACKUP_S3_PREFIX = "backups/";
    process.env.AWS_REGION = "us-east-1";
  });

  it("returns list of backup files", async () => {
    mockSend.mockResolvedValueOnce({
      Contents: [
        {
          Key: "backups/dexcom_20250101.tar.gz",
          LastModified: new Date("2025-01-01"),
          Size: 1048576,
        },
        {
          Key: "backups/dexcom_20250102.tar.gz",
          LastModified: new Date("2025-01-02"),
          Size: 2097152,
        },
      ],
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.files).toHaveLength(2);
    // Files are sorted newest first, so the second file should be first
    expect(data.files[0].key).toBe("backups/dexcom_20250102.tar.gz");
    expect(data.files[1].key).toBe("backups/dexcom_20250101.tar.gz");
  });

  it("returns empty array when no files exist", async () => {
    mockSend.mockResolvedValueOnce({
      Contents: [],
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.files).toEqual([]);
  });

  it("returns 500 when S3 request fails", async () => {
    mockSend.mockRejectedValueOnce(new Error("S3 error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to list backups");
  });

  describe("Method handlers", () => {
    it("POST returns 405 Method Not Allowed", async () => {
      const response = await POST();
      const data = await response.json();
      expect(response.status).toBe(405);
      expect(data.error).toContain("Use GET");
    });

    it("PUT returns 405 Method Not Allowed", async () => {
      const response = await PUT();
      const data = await response.json();
      expect(response.status).toBe(405);
      expect(data.error).toContain("Use GET");
    });

    it("PATCH returns 405 Method Not Allowed", async () => {
      const response = await PATCH();
      const data = await response.json();
      expect(response.status).toBe(405);
      expect(data.error).toContain("Use GET");
    });

    it("DELETE returns 405 Method Not Allowed", async () => {
      const response = await DELETE();
      const data = await response.json();
      expect(response.status).toBe(405);
      expect(data.error).toContain("Use GET");
    });
  });

  it("returns 500 when bucket is not configured", async () => {
    delete process.env.BACKUP_S3_BUCKET;

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("S3 bucket not configured");
    expect(mockSend).not.toHaveBeenCalled();
  });
});
