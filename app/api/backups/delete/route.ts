import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createMethodHandlers } from "@/lib/api-utils";
import { createS3Client } from "@/lib/s3-utils";
import { isAwsNotFoundError } from "@/lib/validation-utils";
import {
  validateS3KeyRequest,
  checkS3ObjectExists,
  createS3NotFoundResponse,
} from "@/lib/s3-handlers";

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
  const validation = await validateS3KeyRequest(request);
  if (!validation.valid) {
    return validation.response;
  }

  const { bucket, key } = validation;

  try {
    // First, check if the object exists using HeadObjectCommand
    // This allows us to return a proper JSON 404 if the file doesn't exist
    const notFoundResponse = await checkS3ObjectExists(
      s3Client,
      bucket,
      key,
      "backups/delete"
    );
    if (notFoundResponse) {
      return notFoundResponse;
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
      return createS3NotFoundResponse(key);
    }

    return NextResponse.json(
      { error: "Failed to delete backup from S3." },
      { status: 500 }
    );
  }
}

