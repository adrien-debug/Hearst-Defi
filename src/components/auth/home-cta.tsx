"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { Button } from "@/components/ui/button";

// Privy (via styled-components) evaluates React hooks at module level,
// crashing Next.js 16 SSR prerender. The Privy-dependent CTA loads client-only.
const HomeCtaWithPrivy = dynamic(
  () =>
    import("./home-cta-privy").then((m) => ({ default: m.HomeCtaWithPrivy })),
  {
    ssr: false,
    loading: () => <HomeCtaPassthrough />,
  }
);

const HAS_PRIVY_APP_ID =
  (process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "").length > 0;

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

export function HomeCta() {
  if (!HAS_PRIVY_APP_ID) return <HomeCtaPassthrough />;
  return <HomeCtaWithPrivy />;
}
