import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-8 py-16">
      <div className="max-w-3xl text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/hearst-connect.svg"
          alt="Hearst Connect"
          className="mx-auto mb-12 h-16 w-auto"
        />
        <p className="eyebrow mb-5">Pre-launch</p>
        <h1 className="h1 text-balance">
          Institutional USDC vault.
          <br />
          <span className="text-[--color-text-muted]">
            Mining-backed structured yield.
          </span>
        </h1>
        <p className="body-lg mx-auto mt-8 max-w-2xl text-pretty">
          Bitcoin mining cashflow, USDC base yield, and rule-based BTC tactical
          exposure in a single vault. Monthly USDC distributions. Target APY
          range 8–15%. Projection conditional on stated assumptions. Not
          guaranteed.
        </p>
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
      </div>
    </main>
  );
}
