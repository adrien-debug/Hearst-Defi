"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// Types — mirror the Persona JS SDK surface we actually use.
// We avoid importing @withpersona/persona-react to stay dependency-free.
// The SDK is loaded at runtime via the official CDN script tag.
// ---------------------------------------------------------------------------

interface PersonaSdkOptions {
  templateId: string;
  environment: "sandbox" | "production";
  referenceId?: string;
  onComplete?: (data: { inquiryId: string; status: string }) => void;
  onCancel?: () => void;
  onError?: (error: { code: string; message: string }) => void;
}

// Persona attaches its constructor to `window.Persona` after the script loads.
declare global {
  interface Window {
    Persona?: {
      Client: new (options: PersonaSdkOptions) => {
        open: () => void;
        cancel: () => void;
      };
    };
  }
}

const PERSONA_SDK_URL =
  "https://cdn.withpersona.com/dist/persona-v5.1.4.js";

export interface PersonaEmbedProps {
  /** Persona template ID — use `process.env.NEXT_PUBLIC_PERSONA_TEMPLATE_ID` */
  templateId: string;
  /** Sandbox for development, production for live */
  environment: "sandbox" | "production";
  /** External reference identifier (e.g. Investor.id) */
  referenceId?: string;
  /** Called when the inquiry completes successfully */
  onComplete?: (data: { inquiryId: string; status: string }) => void;
  /** Called when the user cancels the inquiry */
  onCancel?: () => void;
  /** Additional class names for the container */
  className?: string;
}

/**
 * PersonaEmbed
 *
 * Renders a button that launches the Persona embedded inquiry overlay.
 * The Persona JS SDK is injected once via a <script> tag; subsequent mounts
 * reuse the already-loaded SDK from `window.Persona`.
 *
 * No npm dependency on `@withpersona/persona-react` — script is loaded via CDN
 * to avoid adding a package that requires Persona account credentials at install
 * time and complicates the bundle. The CDN URL is pinned at v5.1.4.
 */
export function PersonaEmbed({
  templateId,
  environment,
  referenceId,
  onComplete,
  onCancel,
  className,
}: PersonaEmbedProps) {
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scriptLoadedRef = useRef(false);

  // Inject the Persona SDK script once per page lifecycle.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already loaded — schedule state update via callback, not synchronously,
    // to satisfy react-hooks/set-state-in-effect lint rule.
    if (window.Persona) {
      const id = setTimeout(() => setSdkReady(true), 0);
      return () => clearTimeout(id);
    }

    // Script already injected (e.g. component remounted before load)
    if (scriptLoadedRef.current) return undefined;
    scriptLoadedRef.current = true;

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PERSONA_SDK_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => setSdkReady(true));
      return undefined;
    }

    const script = document.createElement("script");
    script.src = PERSONA_SDK_URL;
    script.async = true;
    script.onload = () => setSdkReady(true);
    script.onerror = () => setError("Failed to load KYC verification SDK.");
    document.head.appendChild(script);
    return undefined;
  }, []);

  function handleLaunch() {
    if (!window.Persona) {
      setError("Verification SDK is not ready. Please refresh and try again.");
      return;
    }

    setLoading(true);
    setError(null);

    const client = new window.Persona.Client({
      templateId,
      environment,
      referenceId,
      onComplete: (data) => {
        setLoading(false);
        onComplete?.(data);
      },
      onCancel: () => {
        setLoading(false);
        onCancel?.();
      },
      onError: (err) => {
        setLoading(false);
        setError(`Verification error: ${err.message}`);
      },
    });

    client.open();
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <button
        type="button"
        disabled={!sdkReady || loading}
        onClick={handleLaunch}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5",
          "text-sm font-medium transition-opacity",
          "bg-[--ct-accent] text-[--ct-bg-deep]",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "hover:opacity-90 active:opacity-75",
        )}
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Verifying…</span>
          </>
        ) : (
          <span>Begin Identity Verification</span>
        )}
      </button>

      {error !== null && (
        <p
          role="alert"
          className="text-xs text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}
