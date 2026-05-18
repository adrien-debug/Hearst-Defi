"use client";

import { CT_CHROME, CT_PDF, CT_PRODUCT_CONNECT_HEX } from "@/lib/cockpit-tokens";

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
      <body
        style={{
          margin: 0,
          background: CT_CHROME.bgDeep,
          color: CT_CHROME.textPrimary,
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480, padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          {error.digest && (
            <p
              style={{
                fontSize: "0.75rem",
                color: CT_PDF.textDim,
                marginBottom: "1.5rem",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1.25rem",
              background: CT_PRODUCT_CONNECT_HEX,
              color: CT_PDF.textPrimary,
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
