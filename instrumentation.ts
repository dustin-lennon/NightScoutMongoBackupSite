// This file configures the initialization of Sentry on the server and edge.
// The config you add here will be used whenever the server handles a request or edge features are loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

// Load dotenv-vault FIRST, before any other imports that might use environment variables
// This ensures encrypted .env.vault files are decrypted and loaded in production
import "@dotenvx/dotenvx/config";

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
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

