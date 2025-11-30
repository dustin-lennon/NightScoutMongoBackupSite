import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// In test mode, bypass authentication to allow e2e tests to work
// Otherwise, use NextAuth middleware
export default process.env.PLAYWRIGHT_TEST === "true"
  ? async () => NextResponse.next()
  : withAuth();

// Protect everything except the NextAuth routes themselves, the custom sign-in
// page, and static assets (including files under /images).
export const config = {
  matcher: [
    "/((?!api/auth|auth/signin|_next/static|_next/image|favicon.ico|robots.txt|images/).*)"
  ]
};


