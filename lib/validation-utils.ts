/**
 * Validates an S3 key to prevent path traversal attacks.
 * Ensures the key starts with the configured prefix and doesn't contain dangerous patterns.
 * @param key - The S3 key to validate
 * @param prefix - The required prefix (defaults to "backups/")
 * @returns Object with validation result and error message if invalid
 */
export function validateS3Key(
  key: string,
  prefix: string = "backups/"
): { valid: boolean; error?: string } {
  if (!key.startsWith(prefix)) {
    return {
      valid: false,
      error: "Invalid key: must start with configured prefix.",
    };
  }

  // Prevent path traversal attempts (../, ..\, etc.)
  if (key.includes("..") || key.includes("//") || key.includes("\\\\")) {
    return {
      valid: false,
      error: "Invalid key: path traversal detected.",
    };
  }

  return { valid: true };
}

/**
 * Validates a URL to prevent SSRF (Server-Side Request Forgery) attacks.
 * Only allows relative URLs or localhost URLs.
 * @param url - The URL to validate
 * @returns true if the URL is safe, false otherwise
 */
export function isValidBackupUrl(url: string): boolean {
  // Relative URLs are always safe
  if (url.startsWith("/")) {
    return true;
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Only allow localhost, 127.0.0.1, or IPv6 localhost
    // Block external URLs to prevent SSRF
    const allowedHostnames = ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"];

    return allowedHostnames.includes(hostname);
  } catch {
    // If URL parsing fails, it's invalid
    return false;
  }
}

/**
 * Checks if an AWS SDK error is a "not found" error (NoSuchKey, NotFound, or 404).
 * @param err - The error to check
 * @returns true if the error indicates the resource was not found
 */
export function isAwsNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return false;
  }

  const errorName =
    "name" in err ? (err as { name?: string }).name : null;
  const errorCode =
    "$metadata" in err
      ? (err as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode
      : null;
  const errorMessage = err instanceof Error ? err.message : String(err);

  return (
    errorName === "NoSuchKey" ||
    errorName === "NotFound" ||
    errorCode === 404 ||
    errorMessage.includes("NoSuchKey") ||
    errorMessage.includes("does not exist") ||
    errorMessage.includes("The specified key does not exist") ||
    errorMessage.includes("not found") ||
    (errorCode !== null && errorCode !== undefined && errorCode >= 400 && errorCode < 500)
  );
}
