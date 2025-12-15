import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createMethodHandlers } from "@/lib/api-utils";
import { createS3Client } from "@/lib/s3-utils";
import { isAwsNotFoundError } from "@/lib/validation-utils";
import {
  validateS3KeyRequest,
  checkS3ObjectExists,
  createS3NotFoundResponse,
} from "@/lib/s3-handlers";

// Ensure this route runs in Node.js runtime (not Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// AWS SDK will automatically detect the region from the Lambda execution environment
// Fallback to us-east-2 for local development
const s3Client = createS3Client();

// Security: Explicitly handle unsupported HTTP methods
const methodHandlers = createMethodHandlers("GET");
export const POST = methodHandlers.POST;
export const PUT = methodHandlers.PUT;
export const PATCH = methodHandlers.PATCH;
export const DELETE = methodHandlers.DELETE;

export async function GET(request: Request) {
  try {
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
        "backups/download"
      );
      if (notFoundResponse) {
        return notFoundResponse;
      }

      // Object exists, generate signed URL
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 60 * 5 // 5 minutes
      });

      // Redirect the browser directly to the signed S3 URL so it handles the
      // download natively.
      return NextResponse.redirect(signedUrl, { status: 302 });
    } catch (err) {
      console.error("[backups/download] Error generating signed URL", err);

      // Check if it's a "not found" error
      if (isAwsNotFoundError(err)) {
        return createS3NotFoundResponse(key);
      }

      // Generic error fallback
      const errorMessage = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Failed to generate download URL: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error_) {
    // Ultimate fallback - ensure we ALWAYS return JSON, never let Next.js show HTML error page
    console.error("[backups/download] Unexpected outer error:", error_);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing the download request." },
      { 
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}


