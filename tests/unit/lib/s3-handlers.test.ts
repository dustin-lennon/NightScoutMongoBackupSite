import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  validateS3KeyRequest,
  checkS3ObjectExists,
  createS3NotFoundResponse,
} from "@/lib/s3-handlers";
import { createS3Client } from "@/lib/s3-utils";

// Mock S3 utilities
vi.mock("@/lib/s3-utils", () => ({
  createS3Client: vi.fn(() => ({
    send: vi.fn(),
  })),
  checkS3Config: vi.fn(),
  getS3Prefix: vi.fn(() => "backups/"),
}));

// Mock validation utils
vi.mock("@/lib/validation-utils", () => ({
  validateS3Key: vi.fn(),
  isAwsNotFoundError: vi.fn(),
}));

describe("s3-handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BACKUP_S3_BUCKET = "test-bucket";
  });

  describe("validateS3KeyRequest", () => {
    it("returns error when S3 is not configured", async () => {
      const { checkS3Config } = await import("@/lib/s3-utils");
      (checkS3Config as ReturnType<typeof vi.fn>).mockReturnValue({
        configured: false,
        error: "S3 bucket not configured",
      });

      const request = new NextRequest(
        "http://localhost/api/backups/delete?key=backups/test.tar.gz"
      );
      const result = await validateS3KeyRequest(request);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.response.status).toBe(500);
      }
    });

    it("returns error when key is missing", async () => {
      const { checkS3Config } = await import("@/lib/s3-utils");
      (checkS3Config as ReturnType<typeof vi.fn>).mockReturnValue({
        configured: true,
      });

      const request = new NextRequest("http://localhost/api/backups/delete");
      const result = await validateS3KeyRequest(request);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.response.status).toBe(400);
      }
    });

    it("returns error when key validation fails", async () => {
      const { checkS3Config } = await import("@/lib/s3-utils");
      const { validateS3Key } = await import("@/lib/validation-utils");
      (checkS3Config as ReturnType<typeof vi.fn>).mockReturnValue({
        configured: true,
      });
      (validateS3Key as ReturnType<typeof vi.fn>).mockReturnValue({
        valid: false,
        error: "Invalid key",
      });

      const request = new NextRequest(
        "http://localhost/api/backups/delete?key=invalid"
      );
      const result = await validateS3KeyRequest(request);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.response.status).toBe(400);
      }
    });

    it("returns valid result when all checks pass", async () => {
      const { checkS3Config } = await import("@/lib/s3-utils");
      const { validateS3Key } = await import("@/lib/validation-utils");
      (checkS3Config as ReturnType<typeof vi.fn>).mockReturnValue({
        configured: true,
      });
      (validateS3Key as ReturnType<typeof vi.fn>).mockReturnValue({
        valid: true,
      });

      const request = new NextRequest(
        "http://localhost/api/backups/delete?key=backups/test.tar.gz"
      );
      const result = await validateS3KeyRequest(request);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.bucket).toBe("test-bucket");
        expect(result.key).toBe("backups/test.tar.gz");
      }
    });
  });

  describe("checkS3ObjectExists", () => {
    it("returns null when object exists", async () => {
      const mockSend = vi.fn().mockResolvedValue({});
      const mockClient = { send: mockSend };
      (createS3Client as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);

      const result = await checkS3ObjectExists(
        mockClient as unknown as ReturnType<typeof createS3Client>,
        "test-bucket",
        "backups/test.tar.gz",
        "backups/delete"
      );

      expect(result).toBeNull();
      expect(mockSend).toHaveBeenCalled();
    });

    it("returns 404 response when object does not exist", async () => {
      const { isAwsNotFoundError } = await import("@/lib/validation-utils");
      (isAwsNotFoundError as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const notFoundError = {
        name: "NoSuchKey",
        $metadata: { httpStatusCode: 404 },
      };
      const mockSend = vi.fn().mockRejectedValue(notFoundError);
      const mockClient = { send: mockSend };
      (createS3Client as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);

      const result = await checkS3ObjectExists(
        mockClient as unknown as ReturnType<typeof createS3Client>,
        "test-bucket",
        "backups/test.tar.gz",
        "backups/delete"
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe(404);
      const data = await result?.json();
      expect(data.error).toContain("not found");
    });

    it("re-throws non-not-found errors", async () => {
      const { isAwsNotFoundError } = await import("@/lib/validation-utils");
      (isAwsNotFoundError as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const otherError = new Error("Access denied");
      const mockSend = vi.fn().mockRejectedValue(otherError);
      const mockClient = { send: mockSend };
      (createS3Client as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);

      await expect(
        checkS3ObjectExists(
          mockClient as unknown as ReturnType<typeof createS3Client>,
          "test-bucket",
          "backups/test.tar.gz",
          "backups/delete"
        )
      ).rejects.toThrow("Access denied");
    });
  });

  describe("createS3NotFoundResponse", () => {
    it("creates a 404 response with correct error message", async () => {
      const response = createS3NotFoundResponse("backups/test.tar.gz");
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("not found");
      expect(data.error).toContain("backups/test.tar.gz");
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });
  });
});
