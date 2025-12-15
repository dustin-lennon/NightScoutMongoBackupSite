import { NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

// AWS SDK will automatically detect the region from the Lambda execution environment
// Fallback to us-east-2 for local development
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-2",
});

// Security: Explicitly handle unsupported HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use DELETE to delete a backup." },
    { status: 405 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use DELETE to delete a backup." },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use DELETE to delete a backup." },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use DELETE to delete a backup." },
    { status: 405 }
  );
}

export async function DELETE(request: Request) {
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
      const errorName = headErr && typeof headErr === 'object' && 'name' in headErr
        ? (headErr as { name?: string }).name
        : null;
      
      const errorCode = headErr && typeof headErr === 'object' && '$metadata' in headErr
        ? (headErr as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        : null;
      
      const errorMessage = headErr instanceof Error ? headErr.message : String(headErr);
      
      // Check for NoSuchKey error or 404 status code
      const isNotFound = 
        errorName === "NoSuchKey" || 
        errorName === "NotFound" || 
        errorCode === 404 ||
        errorMessage.includes("NoSuchKey") ||
        errorMessage.includes("does not exist") ||
        errorMessage.includes("The specified key does not exist") ||
        (errorCode && errorCode >= 400 && errorCode < 500);
      
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
    if (err && typeof err === 'object') {
      const errorName = 'name' in err ? (err as { name?: string }).name : null;
      const errorCode = '$metadata' in err 
        ? (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        : null;
      
      if (errorName === "NoSuchKey" || errorName === "NotFound" || errorCode === 404) {
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
    }
    
    return NextResponse.json(
      { error: "Failed to delete backup from S3." },
      { status: 500 }
    );
  }
}

