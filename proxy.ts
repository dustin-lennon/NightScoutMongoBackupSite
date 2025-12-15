import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define allowed HTTP methods for each API route
// This allows us to return 405 Method Not Allowed before checking authentication
const ROUTE_METHODS: Record<string, string[]> = {
  "/api/backups/create": ["POST"],
  "/api/backups/delete": ["DELETE"],
  "/api/backups/download": ["GET"],
  "/api/backups/list": ["GET"],
  "/api/pm2/status": ["GET"],
};

export async function proxy(request: NextRequest) {
  // In test mode, bypass authentication to allow e2e tests to work
  if (process.env.PLAYWRIGHT_TEST === "true") {
    return NextResponse.next();
  }

  // Protect API routes (except auth routes)
  if (request.nextUrl.pathname.startsWith("/api/") && !request.nextUrl.pathname.startsWith("/api/auth")) {
    const pathname = request.nextUrl.pathname;
    const method = request.method;
    
    // Check if this route has method restrictions
    const allowedMethods = ROUTE_METHODS[pathname];
    if (allowedMethods && !allowedMethods.includes(method)) {
      // Return 405 Method Not Allowed before checking authentication
      // This ensures wrong methods are rejected even without auth
      return NextResponse.json(
        { 
          error: `Method Not Allowed. Allowed methods: ${allowedMethods.join(", ")}` 
        },
        { 
          status: 405,
          headers: {
            "Allow": allowedMethods.join(", ")
          }
        }
      );
    }
    
    // Method is allowed, now check authentication
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    // If no token, return 401 Unauthorized
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  // For non-API routes, redirect to sign-in if not authenticated
  if (!request.nextUrl.pathname.startsWith("/api/") && 
      !request.nextUrl.pathname.startsWith("/auth/") &&
      !request.nextUrl.pathname.startsWith("/_next/") &&
      !request.nextUrl.pathname.startsWith("/images/") &&
      request.nextUrl.pathname !== "/favicon.ico" &&
      request.nextUrl.pathname !== "/robots.txt") {
    
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

// Protect everything except the NextAuth routes themselves, the custom sign-in
// page, and static assets (including files under /images).
export const config = {
  matcher: [
    "/((?!api/auth|auth/signin|_next/static|_next/image|favicon.ico|robots.txt|images/).*)"
  ]
};

