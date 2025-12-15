import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Mock before any imports
// eslint-disable-next-line @typescript-eslint/no-unused-vars
vi.mock("@aws-sdk/client-s3", () => {
  const mockSend = vi.fn();
  // Create a class constructor for S3Client
  // Use a getter to ensure all instances share the same mockSend
  class MockS3Client {
    get send() {
      return mockSend;
    }
  }
  return {
    S3Client: MockS3Client,
    GetObjectCommand: vi.fn(),
    HeadObjectCommand: vi.fn(),
    __testMockSend: mockSend, // Export it for testing
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

// Set env vars and import route
process.env.BACKUP_S3_BUCKET = "test-bucket";
process.env.AWS_REGION = "us-east-1";

// Import route after env vars are set
import { GET, POST, PUT, PATCH, DELETE } from "@/app/api/backups/download/route";

describe("GET /api/backups/download", () => {
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
    // Mock HeadObjectCommand to succeed (file exists)
    mockSend.mockResolvedValueOnce({});
  });

  it("redirects to signed URL", async () => {
    const mockSignedUrl = "https://s3.amazonaws.com/test-bucket/backups/file.tar.gz?signature=...";
    (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(mockSignedUrl);

    const request = new NextRequest(
      "http://localhost:3000/api/backups/download?key=backups%2Ffile.tar.gz"
    );
    const response = await GET(request);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(mockSignedUrl);
    // Verify HeadObjectCommand was called to check file existence
    expect(mockSend).toHaveBeenCalled();
  });

  it("returns 400 when key is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/backups/download");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required");
  });

  it("returns 500 when bucket is not configured", async () => {
    // Reset modules to test the bucket not configured case
    vi.resetModules();
    delete process.env.BACKUP_S3_BUCKET;
    
    // Re-import the route after clearing the bucket env var
    const { GET: GETWithoutBucket } = await import("@/app/api/backups/download/route");
    
    const request = new NextRequest(
      "http://localhost:3000/api/backups/download?key=backups%2Ffile.tar.gz"
    );
    
    const response = await GETWithoutBucket(request);
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toContain("S3 bucket not configured");
    
    // Restore env var for other tests
    process.env.BACKUP_S3_BUCKET = "test-bucket";
  });

  it("returns 500 when signing fails", async () => {
    // Ensure bucket is set
    process.env.BACKUP_S3_BUCKET = "test-bucket";
    // Mock HeadObjectCommand to succeed (file exists)
    mockSend.mockResolvedValueOnce({});
    (getSignedUrl as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Signing error"));

    const request = new NextRequest(
      "http://localhost:3000/api/backups/download?key=backups%2Ffile.tar.gz"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to generate download URL");
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

  describe("Path traversal validation", () => {
    it("rejects keys with ..", async () => {
      const request = new NextRequest("http://localhost:3000/api/backups/download?key=backups/../etc/passwd");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("path traversal");
    });

    it("rejects keys that don't start with prefix", async () => {
      const request = new NextRequest("http://localhost:3000/api/backups/download?key=etc/passwd");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("must start with configured prefix");
    });

    it("accepts valid keys", async () => {
      mockSend.mockResolvedValueOnce({});
      (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue("https://signed-url");
      const request = new NextRequest("http://localhost:3000/api/backups/download?key=backups/valid-file.tar.gz");
      const response = await GET(request);

      expect(response.status).toBe(302);
    });
  });

  describe("404 handling", () => {
    it("returns 404 when file does not exist", async () => {
      // Reset mocks
      mockSend.mockReset();
      
      const notFoundError = {
        name: "NoSuchKey",
        $metadata: { httpStatusCode: 404 },
      };
      // First call is HeadObjectCommand which fails
      mockSend.mockRejectedValueOnce(notFoundError);

      const request = new NextRequest("http://localhost:3000/api/backups/download?key=backups/nonexistent.tar.gz");
      const response = await GET(request);
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain("not found");
    });
  });

  describe("Error handling", () => {
    it("handles errors when checkS3ObjectExists throws unexpected error", async () => {
      // Mock HeadObjectCommand to throw a non-404 error
      mockSend.mockReset();
      const unexpectedError = new Error("Access denied");
      mockSend.mockRejectedValueOnce(unexpectedError);

      const request = new NextRequest("http://localhost:3000/api/backups/download?key=backups/test.tar.gz");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Failed to generate download URL");
    });

    it("handles errors when getSignedUrl throws", async () => {
      mockSend.mockReset();
      mockSend.mockResolvedValueOnce({}); // HeadObject succeeds
      (getSignedUrl as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Signing failed"));

      const request = new NextRequest("http://localhost:3000/api/backups/download?key=backups/test.tar.gz");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Failed to generate download URL");
    });
  });
});

