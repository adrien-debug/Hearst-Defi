"use client";

import { useLogin, usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * Privy-dependent part of the HomeCta.
 * Only loaded on the client (via dynamic import with ssr:false in home-cta.tsx).
 *
 * Behaviour:
 *  - If the user is authenticated, "Open Dashboard" navigates straight to /dashboard.
 *  - If not authenticated, the primary CTA opens the Privy modal and routes
 *    to /dashboard once login resolves.
 *
 * The middleware-driven redirect from a protected route lands on /login (not
 * here), so we no longer auto-open the modal based on a query param.
 */
export function HomeCtaWithPrivy() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const { login } = useLogin({
    onComplete: () => {
      router.push("/dashboard");
    },
  });

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
      {!ready ? "Loading…" : "Open Dashboard"}
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
