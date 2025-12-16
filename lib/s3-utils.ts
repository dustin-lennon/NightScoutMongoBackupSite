import { S3Client } from "@aws-sdk/client-s3";

/**
 * Creates and returns a configured S3Client instance.
 * Uses AWS_REGION environment variable or defaults to us-east-2.
 * Explicitly uses AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY if available.
 * @returns Configured S3Client instance
 */
export function createS3Client(): S3Client {
  const region = process.env.AWS_REGION || "us-east-2";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  // Explicitly provide credentials if available, otherwise let SDK use default credential chain
  const config: {
    region: string;
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
    };
  } = {
    region,
  };

  if (accessKeyId && secretAccessKey) {
    config.credentials = {
      accessKeyId,
      secretAccessKey,
    };
  }

  return new S3Client(config);
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
 * Note: This only checks for bucket configuration. Credentials are validated
 * when S3 operations are performed, and can come from:
 * - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * - ~/.aws/credentials file
 * - IAM roles (if running on AWS infrastructure)
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

  // Don't check for credentials here - let AWS SDK use default credential chain
  // Credentials can come from env vars, ~/.aws/credentials, or IAM roles
  // Actual credential validation happens when S3 operations are performed
  return { configured: true };
}
