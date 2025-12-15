import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock before any imports
// eslint-disable-next-line @typescript-eslint/no-unused-vars
vi.mock("@aws-sdk/client-s3", () => {
  const mockSend = vi.fn();
  return {
    S3Client: vi.fn(() => ({
      send: mockSend,
    })),
    DeleteObjectCommand: vi.fn(),
    HeadObjectCommand: vi.fn(),
    __testMockSend: mockSend, // Export it for testing
  };
});

// Set env vars before importing
process.env.BACKUP_S3_BUCKET = "test-bucket";
process.env.AWS_REGION = "us-east-1";

// Import route after env vars are set
import { DELETE } from "@/app/api/backups/delete/route";

describe("DELETE /api/backups/delete", () => {
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mock send function from the mocked module
    const mocked = await vi.importMock("@aws-sdk/client-s3");
    mockSend = (mocked as { __testMockSend: ReturnType<typeof vi.fn> }).__testMockSend;
    mockSend.mockReset();
    // Ensure env vars are set for each test
    process.env.BACKUP_S3_BUCKET = "test-bucket";
    process.env.AWS_REGION = "us-east-1";
  });

  it("successfully deletes a backup file", async () => {
    // First call: HeadObjectCommand (file exists check) - succeeds
    // Second call: DeleteObjectCommand (actual deletion) - succeeds
    mockSend.mockResolvedValueOnce({}).mockResolvedValueOnce({});

    const request = new Request("http://localhost/api/backups/delete?key=backups/dexcom_20250101.tar.gz");
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("deleted successfully");
    expect(data.message).toContain("backups/dexcom_20250101.tar.gz");
    expect(mockSend).toHaveBeenCalledTimes(2); // HeadObject + DeleteObject
  });

  it("returns 400 when key parameter is missing", async () => {
    const request = new Request("http://localhost/api/backups/delete");
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required 'key' query parameter");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 500 when S3 bucket is not configured", async () => {
    delete process.env.BACKUP_S3_BUCKET;

    const request = new Request("http://localhost/api/backups/delete?key=backups/test.tar.gz");
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("S3 bucket not configured");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 500 when S3 delete fails", async () => {
    // First call: HeadObjectCommand (file exists check) - succeeds
    // Second call: DeleteObjectCommand (actual deletion) - fails
    mockSend.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("S3 delete error"));

    const request = new Request("http://localhost/api/backups/delete?key=backups/test.tar.gz");
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to delete backup");
    expect(mockSend).toHaveBeenCalledTimes(2); // HeadObject + DeleteObject
  });

  it("properly URL decodes the key parameter", async () => {
    // First call: HeadObjectCommand (file exists check) - succeeds
    // Second call: DeleteObjectCommand (actual deletion) - succeeds
    mockSend.mockResolvedValueOnce({}).mockResolvedValueOnce({});

    const encodedKey = encodeURIComponent("backups/dexcom_2025-01-01.tar.gz");
    const request = new Request(`http://localhost/api/backups/delete?key=${encodedKey}`);
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("deleted successfully");
    expect(mockSend).toHaveBeenCalledTimes(2); // HeadObject + DeleteObject
  });

  it("handles special characters in key parameter", async () => {
    // First call: HeadObjectCommand (file exists check) - succeeds
    // Second call: DeleteObjectCommand (actual deletion) - succeeds
    mockSend.mockResolvedValueOnce({}).mockResolvedValueOnce({});

    const specialKey = "backups/folder with spaces/file.tar.gz";
    const encodedKey = encodeURIComponent(specialKey);
    const request = new Request(`http://localhost/api/backups/delete?key=${encodedKey}`);
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("deleted successfully");
    expect(mockSend).toHaveBeenCalledTimes(2); // HeadObject + DeleteObject
  });
});

