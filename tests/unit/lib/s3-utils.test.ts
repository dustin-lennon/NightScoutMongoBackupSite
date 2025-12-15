import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createS3Client,
  getS3Bucket,
  getS3Prefix,
  checkS3Config,
} from "@/lib/s3-utils";

describe("s3-utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("createS3Client", () => {
    it("creates S3Client with default region", () => {
      delete process.env.AWS_REGION;
      const client = createS3Client();
      expect(client).toBeDefined();
    });

    it("creates S3Client with custom region", () => {
      process.env.AWS_REGION = "us-west-2";
      const client = createS3Client();
      expect(client).toBeDefined();
    });
  });

  describe("getS3Bucket", () => {
    it("returns bucket from environment", () => {
      process.env.BACKUP_S3_BUCKET = "test-bucket";
      expect(getS3Bucket()).toBe("test-bucket");
    });

    it("returns undefined when not configured", () => {
      delete process.env.BACKUP_S3_BUCKET;
      expect(getS3Bucket()).toBeUndefined();
    });
  });

  describe("getS3Prefix", () => {
    it("returns prefix from environment", () => {
      process.env.BACKUP_S3_PREFIX = "custom/prefix/";
      expect(getS3Prefix()).toBe("custom/prefix/");
    });

    it("returns default prefix when not configured", () => {
      delete process.env.BACKUP_S3_PREFIX;
      expect(getS3Prefix()).toBe("backups/");
    });
  });

  describe("checkS3Config", () => {
    it("returns configured true when bucket is set", () => {
      process.env.BACKUP_S3_BUCKET = "test-bucket";
      const result = checkS3Config();
      expect(result.configured).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("returns configured false when bucket is not set", () => {
      delete process.env.BACKUP_S3_BUCKET;
      const result = checkS3Config();
      expect(result.configured).toBe(false);
      expect(result.error).toContain("S3 bucket not configured");
    });
  });
});
