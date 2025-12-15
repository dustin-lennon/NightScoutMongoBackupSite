import { describe, it, expect } from "vitest";
import {
  validateS3Key,
  isValidBackupUrl,
  isAwsNotFoundError,
} from "@/lib/validation-utils";

describe("validation-utils", () => {
  describe("validateS3Key", () => {
    it("accepts valid keys with default prefix", () => {
      const result = validateS3Key("backups/file.tar.gz");
      expect(result.valid).toBe(true);
    });

    it("accepts valid keys with custom prefix", () => {
      const result = validateS3Key("custom/prefix/file.tar.gz", "custom/prefix/");
      expect(result.valid).toBe(true);
    });

    it("rejects keys that don't start with prefix", () => {
      const result = validateS3Key("etc/passwd");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must start with configured prefix");
    });

    it("rejects keys with ..", () => {
      const result = validateS3Key("backups/../etc/passwd");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("path traversal");
    });

    it("rejects keys with //", () => {
      const result = validateS3Key("backups//etc/passwd");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("path traversal");
    });

    it("rejects keys with \\\\", () => {
      const result = validateS3Key("backups/..\\etc\\passwd");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("path traversal");
    });
  });

  describe("isValidBackupUrl", () => {
    it("accepts relative URLs", () => {
      expect(isValidBackupUrl("/backup")).toBe(true);
      expect(isValidBackupUrl("/api/backup")).toBe(true);
    });

    it("accepts localhost URLs", () => {
      expect(isValidBackupUrl("http://localhost:8000/backup")).toBe(true);
      expect(isValidBackupUrl("https://localhost/backup")).toBe(true);
    });

    it("accepts 127.0.0.1 URLs", () => {
      expect(isValidBackupUrl("http://127.0.0.1:8000/backup")).toBe(true);
    });

    it("accepts IPv6 localhost", () => {
      expect(isValidBackupUrl("http://[::1]:8000/backup")).toBe(true);
    });

    it("accepts 0.0.0.0", () => {
      expect(isValidBackupUrl("http://0.0.0.0:8000/backup")).toBe(true);
    });

    it("rejects external URLs", () => {
      expect(isValidBackupUrl("https://evil.com/backup")).toBe(false);
      expect(isValidBackupUrl("http://example.com/backup")).toBe(false);
    });

    it("rejects invalid URLs", () => {
      expect(isValidBackupUrl("not-a-url")).toBe(false);
      expect(isValidBackupUrl("")).toBe(false);
    });
  });

  describe("isAwsNotFoundError", () => {
    it("detects NoSuchKey error", () => {
      const error = { name: "NoSuchKey" };
      expect(isAwsNotFoundError(error)).toBe(true);
    });

    it("detects NotFound error", () => {
      const error = { name: "NotFound" };
      expect(isAwsNotFoundError(error)).toBe(true);
    });

    it("detects 404 status code", () => {
      const error = { $metadata: { httpStatusCode: 404 } };
      expect(isAwsNotFoundError(error)).toBe(true);
    });

    it("detects error messages containing NoSuchKey", () => {
      const error = new Error("NoSuchKey: The specified key does not exist");
      expect(isAwsNotFoundError(error)).toBe(true);
    });

    it("detects 4xx status codes", () => {
      const error = { $metadata: { httpStatusCode: 403 } };
      expect(isAwsNotFoundError(error)).toBe(true);
    });

    it("returns false for non-not-found errors", () => {
      const error = new Error("Network error");
      expect(isAwsNotFoundError(error)).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(isAwsNotFoundError(null)).toBe(false);
      expect(isAwsNotFoundError(undefined)).toBe(false);
    });
  });
});
