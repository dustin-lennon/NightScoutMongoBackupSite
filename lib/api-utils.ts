import { NextResponse } from "next/server";

/**
 * Creates a method not allowed response for HTTP methods that are not supported.
 * @param allowedMethod - The HTTP method that should be used instead
 * @returns NextResponse with 405 status code
 */
export function methodNotAllowed(allowedMethod: string): NextResponse {
  return NextResponse.json(
    { error: `Method Not Allowed. Use ${allowedMethod} to perform this action.` },
    { status: 405 }
  );
}

/**
 * Creates method handlers for unsupported HTTP methods.
 * Returns handlers for GET, POST, PUT, PATCH, DELETE that all return 405.
 * @param allowedMethod - The HTTP method that should be used instead
 * @returns Object with method handlers
 */
export function createMethodHandlers(allowedMethod: string) {
  return {
    GET: () => methodNotAllowed(allowedMethod),
    POST: () => methodNotAllowed(allowedMethod),
    PUT: () => methodNotAllowed(allowedMethod),
    PATCH: () => methodNotAllowed(allowedMethod),
    DELETE: () => methodNotAllowed(allowedMethod),
  };
}
