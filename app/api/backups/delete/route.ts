import { NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// AWS SDK will automatically detect the region from the Lambda execution environment
// Fallback to us-east-2 for local development
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-2",
});

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

  try {
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
    return NextResponse.json(
      { error: "Failed to delete backup from S3." },
      { status: 500 }
    );
  }
}

