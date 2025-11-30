// This file configures the initialization of Sentry on the server and edge.
// The config you add here will be used whenever the server handles a request or edge features are loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Load dotenv-vault ONLY in Node.js runtime (not Edge runtime)
  // This ensures encrypted .env.vault files are decrypted and loaded in production
  // Edge runtime cannot use Node.js built-in modules, so we must conditionally import
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import to prevent bundling for Edge runtime
    // Gracefully handle missing .env file (production may use PM2 env vars directly)
    try {
      await import("@dotenvx/dotenvx/config");
    } catch (error) {
      // In production, environment variables may be passed directly via PM2
      // Missing .env file is acceptable if all required env vars are set
      if (process.env.NODE_ENV !== "production") {
        console.warn("[instrumentation] Failed to load dotenvx config:", error);
      }
    }
    
    Sentry.init({
      dsn: process.env.SENTRY_DSN,

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,

      // Uncomment the line below to enable Spotlight (https://spotlightjs.com)
      // spotlight: process.env.NODE_ENV === 'development',
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,
    });
  }
}

