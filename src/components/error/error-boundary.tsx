"use client";

import React from "react";

import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * React Error Boundary for the Hearst Connect product shell.
 *
 * Catches render errors in child components and displays a professional
 * fallback instead of crashing the whole page.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
    // Capture in Sentry so production errors are visible in the dashboard
    import("@sentry/nextjs").then(({ captureException }) => {
      captureException(error, { extra: { errorInfo } });
    });
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="max-w-md w-full space-y-6 text-center p-8">
            <div className="w-16 h-16 mx-auto rounded-[var(--ct-radius-full)] ct-status-danger-bg flex items-center justify-center">
              <span className="text-2xl ct-status-danger" aria-hidden>
                ⚠
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-[var(--ct-text-primary)]">
                Something went wrong
              </h2>
              <p className="text-sm text-[var(--ct-text-muted)]">
                We encountered an unexpected error. Please refresh the page or
                try again later.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              Refresh page
            </Button>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="mt-4 p-4 rounded-[var(--ct-radius-lg)] ct-status-danger-bg text-[var(--ct-status-danger)] text-left text-xs overflow-auto">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
