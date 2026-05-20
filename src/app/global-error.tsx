"use client";

import { STANDALONE_STYLES, StandaloneResetButton } from "@/components/error/error-shell";

export const dynamic = "force-dynamic";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={STANDALONE_STYLES.body_html}>
        <div style={STANDALONE_STYLES.container}>
          <h1 style={STANDALONE_STYLES.title}>Something went wrong</h1>
          {error.digest && (
            <p style={STANDALONE_STYLES.digest}>
              Error ID: {error.digest}
            </p>
          )}
          <StandaloneResetButton onClick={reset} label="Try again" />
        </div>
      </body>
    </html>
  );
}
