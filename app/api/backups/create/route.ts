import { NextResponse } from "next/server";

// This endpoint calls the Python bot's FastAPI server to trigger a backup.
// The Python bot handles: MongoDB dump -> compression -> S3 upload -> cleanup.

// Use environment variable if set, otherwise use relative URL (for same-domain setup)
// In production with nginx, use relative URL so requests go through nginx routing
const PYTHON_API_URL = process.env.PYTHON_BACKUP_API_URL || "";

export async function POST() {
  try {
    const fullUrl = PYTHON_API_URL ? `${PYTHON_API_URL}/backup` : "/backup";
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


