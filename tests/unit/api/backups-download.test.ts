import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Mock before any imports
// eslint-disable-next-line @typescript-eslint/no-unused-vars
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

// Set env vars and import route
process.env.BACKUP_S3_BUCKET = "test-bucket";
process.env.AWS_REGION = "us-east-1";

// Import route after env vars are set
import { GET } from "@/app/api/backups/download/route";

describe("GET /api/backups/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure env vars are set for each test
    process.env.BACKUP_S3_BUCKET = "test-bucket";
    process.env.AWS_REGION = "us-east-1";
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
    
    (getSignedUrl as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Signing error"));

    const request = new NextRequest(
      "http://localhost:3000/api/backups/download?key=backups%2Ffile.tar.gz"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to generate download URL");
  });
});

