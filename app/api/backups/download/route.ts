import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// AWS SDK will automatically detect the region from the Lambda execution environment
// Fallback to us-east-2 for local development
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-2",
});

export async function GET(request: Request) {
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
    return NextResponse.json(
      { error: "Failed to generate download URL." },
      { status: 500 }
    );
  }
}


