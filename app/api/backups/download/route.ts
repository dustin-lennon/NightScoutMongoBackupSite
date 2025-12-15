import { NextResponse } from "next/server";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

        // Log unexpected errors for debugging
        console.error("[backups/download] Unexpected HeadObject error:", {
          error: headErr,
        });

        // If it's a different error, re-throw to be handled below
        throw headErr;
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

      // Generic error fallback
      const errorMessage = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Failed to generate download URL: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (outerErr) {
    // Ultimate fallback - ensure we ALWAYS return JSON, never let Next.js show HTML error page
    console.error("[backups/download] Unexpected outer error:", outerErr);
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


