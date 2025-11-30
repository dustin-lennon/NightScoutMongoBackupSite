import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // In test mode, bypass authentication to allow e2e tests to work
  if (process.env.PLAYWRIGHT_TEST === "true") {
    return NextResponse.next();
  }

  // Check for authentication token
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });

  // If no token, redirect to sign-in page
  if (!token) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // User is authenticated, proceed with request
  return NextResponse.next();
}

// Protect everything except the NextAuth routes themselves, the custom sign-in
// page, and static assets (including files under /images).
export const config = {
  matcher: [
    "/((?!api/auth|auth/signin|_next/static|_next/image|favicon.ico|robots.txt|images/).*)"
  ]
};

