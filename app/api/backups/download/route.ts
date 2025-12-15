import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Ensure this route runs in Node.js runtime (not Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// AWS SDK will automatically detect the region from the Lambda execution environment
// Fallback to us-east-2 for local development
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-2",
});

// Security: Explicitly handle unsupported HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use GET to download a backup." },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use GET to download a backup." },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use GET to download a backup." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use GET to download a backup." },
    { status: 405 }
  );
}

export async function GET(request: Request) {
  try {
    const bucket = process.env.BACKUP_S3_BUCKET;
    
    if (!bucket) {
      return NextResponse.json(
        { error: "S3 bucket not configured on server." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Missing required 'key' query parameter." },
        { status: 400 }
      );
    }

    // Security: Validate key to prevent path traversal attacks
    // Ensure key starts with the expected prefix and doesn't contain dangerous patterns
    const prefix = process.env.BACKUP_S3_PREFIX || "backups/";
    if (!key.startsWith(prefix)) {
      return NextResponse.json(
        { error: "Invalid key: must start with configured prefix." },
        { status: 400 }
      );
    }

    // Prevent path traversal attempts (../, ..\, etc.)
    if (key.includes("..") || key.includes("//") || key.includes("\\\\")) {
      return NextResponse.json(
        { error: "Invalid key: path traversal detected." },
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
        // AWS SDK v3 error structure: errors have a 'name' property and '$metadata'
        // Check multiple ways to detect NoSuchKey/NotFound errors
        const errorName = headErr && typeof headErr === 'object' && 'name' in headErr
          ? (headErr as { name?: string }).name
          : null;
        
        const errorCode = headErr && typeof headErr === 'object' && '$metadata' in headErr
          ? (headErr as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
          : null;
        
        const errorMessage = headErr instanceof Error ? headErr.message : String(headErr);
        
        // Check for NoSuchKey error or 404 status code
        // AWS SDK v3 uses "NoSuchKey" as the error name
        // Also check for common error patterns - be very permissive here
        const isNotFound = 
          errorName === "NoSuchKey" || 
          errorName === "NotFound" || 
          errorCode === 404 ||
          errorMessage.includes("NoSuchKey") ||
          errorMessage.includes("does not exist") ||
          errorMessage.includes("The specified key does not exist") ||
          errorMessage.includes("not found") ||
          (errorCode && errorCode >= 400 && errorCode < 500); // Any 4xx error from S3
        
        if (isNotFound) {
          return NextResponse.json(
            { error: `Backup file not found: ${key}` },
            { 
              status: 404,
              headers: {
                "Content-Type": "application/json"
              }
            }
          );
        }
        
        // Log unexpected errors for debugging
        console.error("[backups/download] Unexpected HeadObject error:", {
          error: headErr,
          name: errorName,
          code: errorCode,
          message: errorMessage
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
      
      // AWS SDK v3 error structure
      if (err && typeof err === 'object') {
        const errorName = 'name' in err ? (err as { name?: string }).name : null;
        const errorCode = '$metadata' in err 
          ? (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
          : null;
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        // S3 returns "NoSuchKey" when object doesn't exist
        // Be very permissive - if it's any 4xx error, treat as not found
        if (errorName === "NoSuchKey" || errorName === "NotFound" || errorCode === 404 || (errorCode && errorCode >= 400 && errorCode < 500)) {
          return NextResponse.json(
            { error: `Backup file not found: ${key}` },
            { 
              status: 404,
              headers: {
                "Content-Type": "application/json"
              }
            }
          );
        }
        
        // Generic AWS error
        return NextResponse.json(
          { error: `Failed to generate download URL: ${errorMessage}` },
          { status: 500 }
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


