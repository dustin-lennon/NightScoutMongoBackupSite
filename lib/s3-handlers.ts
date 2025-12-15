import { NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { checkS3Config, getS3Prefix, createS3Client } from "@/lib/s3-utils";
import { validateS3Key, isAwsNotFoundError } from "@/lib/validation-utils";

/**
 * Validates S3 configuration and extracts/validates the key parameter from a request.
 * @param request - The incoming request
 * @returns Object with validation result and extracted values, or error response
 */
export async function validateS3KeyRequest(request: Request): Promise<
  | {
      valid: true;
      bucket: string;
      key: string;
    }
  | {
      valid: false;
      response: NextResponse;
    }
> {
  const s3Config = checkS3Config();
  if (!s3Config.configured) {
    return {
      valid: false,
      response: NextResponse.json({ error: s3Config.error }, { status: 500 }),
    };
  }

  const bucket = process.env.BACKUP_S3_BUCKET!;
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: "Missing required 'key' query parameter." },
        { status: 400 }
      ),
    };
  }

  const prefix = getS3Prefix();
  const keyValidation = validateS3Key(key, prefix);
  if (!keyValidation.valid) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: keyValidation.error },
        { status: 400 }
      ),
    };
  }

  return { valid: true, bucket, key };
}

/**
 * Checks if an S3 object exists using HeadObjectCommand.
 * Returns a 404 response if the object doesn't exist.
 * @param s3Client - The S3 client instance
 * @param bucket - The S3 bucket name
 * @param key - The S3 object key
 * @param routeName - The route name for error logging (e.g., "backups/delete")
 * @returns NextResponse with 404 if not found, or null if object exists
 */
export async function checkS3ObjectExists(
  s3Client: ReturnType<typeof createS3Client>,
  bucket: string,
  key: string,
  routeName: string
): Promise<NextResponse | null> {
  try {
    const headCommand = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await s3Client.send(headCommand);
    return null; // Object exists
  } catch (headErr: unknown) {
    if (isAwsNotFoundError(headErr)) {
      return NextResponse.json(
        { error: `Backup file not found: ${key}` },
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Log unexpected errors for debugging
    if (routeName === "backups/download") {
      console.error(`[${routeName}] Unexpected HeadObject error:`, {
        error: headErr,
      });
    }

    // Re-throw to be handled by caller
    throw headErr;
  }
}

/**
 * Creates a standardized 404 response for S3 not found errors.
 * @param key - The S3 object key that was not found
 * @returns NextResponse with 404 status
 */
export function createS3NotFoundResponse(key: string): NextResponse {
  return NextResponse.json(
    { error: `Backup file not found: ${key}` },
    {
      status: 404,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
