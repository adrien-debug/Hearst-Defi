"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { login, devLogin, devLoginAdmin } from "@/lib/auth/actions";
import { safeFrom } from "@/lib/safe-redirect";

/** Dev-only one-click sign-in is shown only outside production builds. */
const SHOW_DEV_SIGN_IN = process.env.NODE_ENV !== "production";

/**
 * Email + password sign-in form (database auth).
 *
 * On success the `login` server action redirects (this component never sees a
 * resolved promise). On failure it returns `{ ok: false, error }`, shown inline
 * via `.ct-status-danger`. Privy is NOT used here — wallet connect happens later
 * in the payment flow.
 *
 * Design-lock: only locked primitives (`Button`, `.ct-input`, `.ct-*`). No new
 * tokens, no magic hex/px, no `dark:` modifiers.
 */
export function LoginForm() {
  const searchParams = useSearchParams();
  const from = safeFrom(searchParams.get("from"));

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      // On success the action redirects (throws NEXT_REDIRECT) and never
      // returns here; on failure we get a typed error to render inline.
      const result = await login(formData, from);
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  function onDevSignIn() {
    setError(null);
    startTransition(async () => {
      await devLogin(from);
    });
  }

  function onDevAdminSignIn() {
    setError(null);
    startTransition(async () => {
      // Pass the RAW ?from= (not the investor-defaulted `from`, which resolves
      // to /portfolio) so devLoginAdmin can default to /admin when absent.
      await devLoginAdmin(searchParams.get("from") ?? undefined);
    });
  }

  return (
    <>
    <form action={onSubmit} className="space-y-4" aria-label="Sign in">
      <label className="block text-xs" htmlFor="login-email">
        <span className="mb-1 block ct-text-muted uppercase tracking-wide">
          Email
        </span>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          disabled={isPending}
          placeholder="you@institution.com"
          className="ct-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "login-error" : undefined}
        />
      </label>

      <label className="block text-xs" htmlFor="login-password">
        <span className="mb-1 block ct-text-muted uppercase tracking-wide">
          Password
        </span>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          placeholder="••••••••"
          className="ct-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "login-error" : undefined}
        />
      </label>

      {error ? (
        <p id="login-error" className="ct-status-danger body-xs" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full shadow-none hover:shadow-none"
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>

      {SHOW_DEV_SIGN_IN ? (
        <div className="mt-4 border-t ct-border-soft pt-4">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full"
            onClick={onDevSignIn}
            disabled={isPending}
          >
            Dev sign-in (skip login)
          </Button>
          <p className="mt-2 text-center eyebrow ct-text-faint">
            Development only · creates a session as the dev investor
          </p>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="mt-3 w-full"
            onClick={onDevAdminSignIn}
            disabled={isPending}
          >
            Dev sign-in (admin)
          </Button>
          <p className="mt-2 text-center eyebrow ct-text-faint">
            Development only · creates an ADMIN session
          </p>
        </div>
      ) : null}
    </>
  );
}
