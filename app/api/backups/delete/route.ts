import { NextResponse } from "next/server";
import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createMethodHandlers } from "@/lib/api-utils";
import {
  createS3Client,
  checkS3Config,
  getS3Prefix,
} from "@/lib/s3-utils";
import {
  validateS3Key,
  isAwsNotFoundError,
} from "@/lib/validation-utils";

// AWS SDK will automatically detect the region from the Lambda execution environment
// Fallback to us-east-2 for local development
const s3Client = createS3Client();

// Security: Explicitly handle unsupported HTTP methods
const methodHandlers = createMethodHandlers("DELETE");
export const GET = methodHandlers.GET;
export const POST = methodHandlers.POST;
export const PUT = methodHandlers.PUT;
export const PATCH = methodHandlers.PATCH;

export async function DELETE(request: Request) {
  const s3Config = checkS3Config();
  if (!s3Config.configured) {
    return NextResponse.json(
      { error: s3Config.error },
      { status: 500 }
    );
  }

  const bucket = process.env.BACKUP_S3_BUCKET!;

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json(
      { error: "Missing required 'key' query parameter." },
      { status: 400 }
    );
  }

  // Security: Validate key to prevent path traversal attacks
  const prefix = getS3Prefix();
  const keyValidation = validateS3Key(key, prefix);
  if (!keyValidation.valid) {
    return NextResponse.json(
      { error: keyValidation.error },
      { status: 400 }
    );
  }

  try {
    // First, check if the object exists using HeadObjectCommand
    // This allows us to return a proper JSON 404 if the file doesn't exist
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: bucket,
        Key: key
      });
      await s3Client.send(headCommand);
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

      // If it's a different error, re-throw to be handled below
      throw headErr;
    }

    // Object exists, proceed with deletion
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    });

    await s3Client.send(command);

    return NextResponse.json(
      { message: `Backup '${key}' deleted successfully.` },
      { status: 200 }
    );
  } catch (err) {
    console.error("[backups/delete] Error deleting S3 object", err);

    // Check if it's a "not found" error that wasn't caught above
    if (isAwsNotFoundError(err)) {
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

    return NextResponse.json(
      { error: "Failed to delete backup from S3." },
      { status: 500 }
    );
  }
}

