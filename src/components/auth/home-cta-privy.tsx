"use client";

import { useLogin, usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

/**
 * Privy-dependent part of the HomeCta.
 * Only loaded on the client (via dynamic import with ssr:false in home-cta.tsx).
 *
 * Behaviour:
 *  - If the user is authenticated, "Open Dashboard" navigates straight to /dashboard.
 *  - If not authenticated, the primary CTA opens the Privy modal and routes
 *    to /dashboard once login resolves.
 *  - If we arrive here via ?login=true (middleware redirect), we auto-open
 *    the modal once, then strip the param to avoid replay on re-renders.
 */
export function HomeCtaWithPrivy() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authenticated } = usePrivy();
  const { login } = useLogin({
    onComplete: () => {
      const from = searchParams.get("from");
      router.push(from && from.startsWith("/") ? from : "/dashboard");
    },
  });
  const autoOpenedRef = useRef(false);

  const wantsLogin = searchParams.get("login") === "true";

  useEffect(() => {
    if (!ready) return;
    if (!wantsLogin) return;
    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    if (authenticated) {
      const from = searchParams.get("from");
      router.replace(from && from.startsWith("/") ? from : "/dashboard");
      return;
    }
    login();
  }, [ready, wantsLogin, authenticated, login, router, searchParams]);

  const dashboardCta = authenticated ? (
    <Button variant="primary" size="lg" asChild>
      <Link href="/dashboard">Open Dashboard</Link>
    </Button>
  ) : (
    <Button
      variant="primary"
      size="lg"
      onClick={() => login()}
      disabled={!ready}
      aria-busy={!ready}
    >
      {!ready
        ? "Loading…"
        : wantsLogin
          ? "Log in to access dashboard"
          : "Open Dashboard"}
    </Button>
  );

  return (
    <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
      {dashboardCta}
      <Button variant="secondary" size="lg" asChild>
        <Link href="/admin/roadmap">Admin</Link>
      </Button>
    </div>
  );
}
