"use client";

import Link from "next/link";
import { useEffect } from "react";

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    // Surface to console for local diagnostics; production logs handled upstream.
    console.error("[admin] uncaught error", error);
  }, [error]);

  const rawMessage = error.message ?? "Erreur inconnue.";
  const message =
    rawMessage.length > 500 ? `${rawMessage.slice(0, 500)}…` : rawMessage;

  return (
    <div
      className="glass-panel"
      style={{
        margin: "2.5rem auto",
        maxWidth: "42rem",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
      role="alert"
      aria-live="assertive"
    >
      <header style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span
          className="eyebrow"
          style={{ color: "var(--ct-status-danger)" }}
        >
          Admin · Erreur
        </span>
        <h1 className="h2" style={{ margin: 0 }}>
          Une erreur est survenue
        </h1>
      </header>

      <pre
        className="mono"
        style={{
          background: "var(--ct-surface-1)",
          border: "1px solid var(--ct-border)",
          borderRadius: "var(--ct-radius-md)",
          padding: "0.875rem 1rem",
          color: "var(--ct-text-primary)",
          fontSize: "0.8125rem",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxHeight: "16rem",
          overflow: "auto",
        }}
      >
        {message}
      </pre>

      {error.digest ? (
        <p
          className="body-xs"
          style={{ margin: 0, color: "var(--ct-text-muted)" }}
        >
          Digest: <span className="mono">{error.digest}</span>
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.75rem",
          marginTop: "0.25rem",
        }}
      >
        <button
          type="button"
          onClick={() => reset()}
          style={{
            appearance: "none",
            border: "1px solid var(--ct-border-strong)",
            background: "var(--ct-text-strong)",
            color: "var(--ct-bg-deep)",
            padding: "0.5rem 1rem",
            borderRadius: "var(--ct-radius-full)",
            fontSize: "0.8125rem",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Réessayer
        </button>
        <Link
          href="/admin"
          style={{
            border: "1px solid var(--ct-border-strong)",
            background: "var(--ct-surface-1)",
            color: "var(--ct-text-primary)",
            padding: "0.5rem 1rem",
            borderRadius: "var(--ct-radius-full)",
            fontSize: "0.8125rem",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Retour admin
        </Link>
      </div>
    </div>
  );
}
