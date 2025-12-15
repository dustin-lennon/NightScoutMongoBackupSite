import { NextResponse } from "next/server";

// This endpoint calls the Python bot's FastAPI server to trigger a backup.
// The Python bot handles: MongoDB dump -> compression -> S3 upload -> cleanup.

// Use environment variable if set, otherwise use relative URL (for same-domain setup)
const PYTHON_API_URL = process.env.PYTHON_BACKUP_API_URL || "";

// Security: Validate URL to prevent SSRF attacks
function isValidBackupUrl(url: string): boolean {
  // Relative URLs are always safe
  if (url.startsWith("/")) {
    return true;
  }
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Only allow localhost, 127.0.0.1, or IPv6 localhost
    // Block external URLs to prevent SSRF
    const allowedHostnames = [
      "localhost",
      "127.0.0.1",
      "[::1]",
      "0.0.0.0"
    ];
    
    return allowedHostnames.includes(hostname);
  } catch {
    // If URL parsing fails, it's invalid
    return false;
  }
}

// Security: Explicitly handle unsupported HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use POST to create a backup." },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use POST to create a backup." },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use POST to create a backup." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use POST to create a backup." },
    { status: 405 }
  );
}

export async function POST() {
  try {
    const fullUrl = PYTHON_API_URL ? `${PYTHON_API_URL}/backup` : "/backup";
    
    // Security: Prevent SSRF attacks by validating the URL
    if (!isValidBackupUrl(fullUrl)) {
      return NextResponse.json(
        { error: "Invalid backup API URL configuration." },
        { status: 500 }
      );
    }

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[backups/create] Python API error", {
        status: response.status,
        error: errorText
      });
      return NextResponse.json(
        { error: `Backup failed: ${errorText || "Unknown error"}` },
        { status: response.status }
      );
    }

    const data = (await response.json()) as {
      success: boolean;
      url?: string;
      stats?: Record<string, unknown>;
    };

    if (data.success) {
      return NextResponse.json(
        {
          message: "Backup created successfully and uploaded to S3.",
          url: data.url,
          stats: data.stats
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: "Backup completed but reported failure." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[backups/create] Error calling Python API", err);
    return NextResponse.json(
      {
        error: `Failed to connect to backup service: ${err instanceof Error ? err.message : "Unknown error"}`
      },
      { status: 500 }
    );
  }
}


