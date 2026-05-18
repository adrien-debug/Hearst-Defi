import Link from "next/link";

import { CT_CHROME, CT_PDF, CT_PRODUCT_CONNECT_HEX } from "@/lib/cockpit-tokens";

export const dynamic = "force-dynamic";

export default function NotFound() {
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
            404 — Page not found
          </h1>
          <Link
            href="/"
            style={{
              display: "inline-block",
              marginTop: "1rem",
              padding: "0.5rem 1.25rem",
              background: CT_PRODUCT_CONNECT_HEX,
              color: CT_PDF.textPrimary,
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Go home
          </Link>
        </div>
      </body>
    </html>
  );
}
