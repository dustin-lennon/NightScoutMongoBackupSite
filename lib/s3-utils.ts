import { S3Client } from "@aws-sdk/client-s3";

/**
 * Creates and returns a configured S3Client instance.
 * Uses AWS_REGION environment variable or defaults to us-east-2.
 * @returns Configured S3Client instance
 */
export function createS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION || "us-east-2",
  });
}

/**
 * Gets the S3 bucket name from environment variables.
 * @returns The bucket name or undefined if not configured
 */
export function getS3Bucket(): string | undefined {
  return process.env.BACKUP_S3_BUCKET;
}

/**
 * Gets the S3 prefix from environment variables.
 * @returns The prefix, defaults to "backups/" if not configured
 */
export function getS3Prefix(): string {
  return process.env.BACKUP_S3_PREFIX || "backups/";
}

/**
 * Checks if S3 is properly configured.
 * @returns Object with configured status and error message if not configured
 */
export function checkS3Config(): { configured: boolean; error?: string } {
  const bucket = getS3Bucket();
  if (!bucket) {
    return {
      configured: false,
      error: "S3 bucket not configured on server.",
    };
  }
  return { configured: true };
}
