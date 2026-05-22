"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ErrorShellLayout } from "@/components/error/error-shell";
import { Button } from "@/components/ui/button";

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    // Surface to console for local diagnostics; production logs handled upstream.
    console.error("[admin] uncaught error", error);
  }, [error]);

  const rawMessage = error.message ?? "Unknown error.";
  const message =
    rawMessage.length > 500 ? `${rawMessage.slice(0, 500)}…` : rawMessage;

  return (
    <ErrorShellLayout
      tone="danger"
      scope="Admin · Error"
      title="Something went wrong"
      digest={error.digest}
      errorMessage={message}
      actions={
        <>
          <Button type="button" variant="primary" size="sm" onClick={() => reset()}>
            Try again
          </Button>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-full border border-[var(--ct-border-strong)] bg-[var(--ct-surface-1)] px-4 py-2 text-sm font-medium text-[var(--ct-text-primary)] no-underline"
          >
            Back to admin
          </Link>
        </>
      }
    />
  );
}
