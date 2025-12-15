import { NextResponse } from "next/server";
import { createMethodHandlers } from "@/lib/api-utils";
import { isValidBackupUrl } from "@/lib/validation-utils";

// This endpoint calls the Python bot's FastAPI server to trigger a backup.
// The Python bot handles: MongoDB dump -> compression -> S3 upload -> cleanup.

// Use environment variable if set, otherwise use relative URL (for same-domain setup)
const PYTHON_API_URL = process.env.PYTHON_BACKUP_API_URL || "";
const PYTHON_API_KEY = process.env.PYTHON_BACKUP_API_KEY || "";

// Security: Explicitly handle unsupported HTTP methods
const methodHandlers = createMethodHandlers("POST");
export const GET = methodHandlers.GET;
export const PUT = methodHandlers.PUT;
export const PATCH = methodHandlers.PATCH;
export const DELETE = methodHandlers.DELETE;

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

    // Build headers with API key authentication
    const headers: HeadersInit = {
      "Content-Type": "application/json"
    };
    
    // Add API key authentication if configured
    if (PYTHON_API_KEY) {
      headers["Authorization"] = `Bearer ${PYTHON_API_KEY}`;
    }

    const response = await fetch(fullUrl, {
      method: "POST",
      headers
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


