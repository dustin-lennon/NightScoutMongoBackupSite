"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

type ErrorPageProps = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

export default function ErrorPage({
  error,
  reset
}: ErrorPageProps) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-red-500/40 bg-red-950/40 p-6">
        <h2 className="text-xl font-semibold text-red-200">Something went wrong!</h2>
        <p className="text-sm text-red-300">
          An error occurred while loading this page. The error has been reported to our team.
        </p>
        {process.env.NODE_ENV === "development" && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-red-400">Error details (dev only)</summary>
            <pre className="mt-2 overflow-auto rounded bg-slate-900 p-2 text-xs text-red-200">
              {error.message}
            </pre>
          </details>
        )}
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-red-900/60 px-4 py-2 text-sm font-medium text-red-200 ring-1 ring-red-800/60 hover:bg-red-800/60"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

