"use client";

import { useLogin, usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

const HAS_PRIVY_APP_ID =
  (process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "").length > 0;

/**
 * Homepage CTA row.
 *
 * Behaviour:
 *  - If Privy isn't configured (no `appId` in env), `ready` stays falsy with
 *    no provider and we fall back to a plain link — preserves the existing
 *    dev experience.
 *  - If the user is authenticated, "Open Dashboard" navigates straight to
 *    `/dashboard`.
 *  - If not authenticated, the primary CTA opens the Privy modal and routes
 *    to `/dashboard` once login resolves.
 *  - If we arrive here via `?login=true` (middleware redirect), we auto-open
 *    the modal once, then strip the param to avoid replay on re-renders.
 */
export function HomeCta() {
  if (!HAS_PRIVY_APP_ID) return <HomeCtaPassthrough />;
  return <HomeCtaWithPrivy />;
}

function HomeCtaPassthrough() {
  return (
    <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
      <Button variant="primary" size="lg" asChild>
        <Link href="/dashboard">Open Dashboard</Link>
      </Button>
      <Link
        href="/admin/roadmap"
        className="rounded-[--radius-button] border border-[--color-border] px-5 py-3 text-base font-medium text-[--color-text-muted] hover:text-[--color-text]"
      >
        Admin
      </Link>
    </div>
  );
}

function HomeCtaWithPrivy() {
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
      onClick={() => (ready ? login() : router.push("/dashboard"))}
    >
      {wantsLogin ? "Log in to access dashboard" : "Open Dashboard"}
    </Button>
  );

  return (
    <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
      {dashboardCta}
      <Link
        href="/admin/roadmap"
        className="rounded-[--radius-button] border border-[--color-border] px-5 py-3 text-base font-medium text-[--color-text-muted] hover:text-[--color-text]"
      >
        Admin
      </Link>
    </div>
  );
}
