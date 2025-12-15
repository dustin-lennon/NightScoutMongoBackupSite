import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createMethodHandlers } from "@/lib/api-utils";
import {
  createS3Client,
  checkS3Config,
  getS3Prefix,
} from "@/lib/s3-utils";

// This route runs on the server (Node.js runtime) and must never expose any
// credentials to the client. It uses the existing S3 bucket configured via environment variables.

// AWS SDK will automatically detect the region from the Lambda execution environment
// Fallback to us-east-2 for local development
const s3Client = createS3Client();

// Security: Explicitly handle unsupported HTTP methods
const methodHandlers = createMethodHandlers("GET");
export const POST = methodHandlers.POST;
export const PUT = methodHandlers.PUT;
export const PATCH = methodHandlers.PATCH;
export const DELETE = methodHandlers.DELETE;

export async function GET() {
  const s3Config = checkS3Config();
  if (!s3Config.configured) {
    return NextResponse.json(
      { error: s3Config.error },
      { status: 500 }
    );
  }

  const bucket = process.env.BACKUP_S3_BUCKET!;
  const prefix = getS3Prefix();

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 200
    });

    const result = await s3Client.send(command);

    const files =
      result.Contents?.map((obj) => ({
        key: obj.Key ?? "",
        lastModified: obj.LastModified?.toISOString(),
        size: obj.Size ?? 0
      })).filter((f) => f.key) ?? [];

    // Sort newest first (by LastModified)
    files.sort((a, b) => {
      if (!a.lastModified || !b.lastModified) return 0;
      return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
    });

    return NextResponse.json({ files });
  } catch (err) {
    console.error("[backups/list] Error listing S3 objects", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to list backups from S3: ${errorMessage}` },
      { status: 500 }
    );
  }
}

