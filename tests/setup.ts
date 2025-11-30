import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

// Suppress expected error logs in tests
// These are from route handlers that intentionally test error conditions
// and from React act() warnings that occur in Vitest's jsdom environment
const originalError = console.error;
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    const firstArg = args[0];
    
    // Suppress React act() warnings
    if (
      typeof firstArg === "string" &&
      firstArg.includes("not configured to support act(...)")
    ) {
      return;
    }
    
    // Suppress expected error logs from route handlers during tests
    // These are intentional error conditions being tested
    if (typeof firstArg === "string") {
      const errorMessage = firstArg;
      if (
        errorMessage.includes("[backups/list] Error listing S3 objects") ||
        errorMessage.includes("[backups/delete] Error deleting S3 object") ||
        errorMessage.includes("[backups/create] Error calling Python API") ||
        errorMessage.includes("[backups/create] Python API error") ||
        errorMessage.includes("[backups/download] Error generating signed URL")
      ) {
        return;
      }
    }
    
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  console.error = originalError;
});

// Set default environment variables for tests
// These can be overridden in individual tests
if (!process.env.BACKUP_S3_BUCKET) {
  process.env.BACKUP_S3_BUCKET = "test-bucket";
}
if (!process.env.BACKUP_S3_PREFIX) {
  process.env.BACKUP_S3_PREFIX = "backups/";
}
if (!process.env.AWS_REGION) {
  process.env.AWS_REGION = "us-east-1";
}
if (!process.env.PYTHON_BACKUP_API_URL) {
  process.env.PYTHON_BACKUP_API_URL = "http://localhost:8000";
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});

