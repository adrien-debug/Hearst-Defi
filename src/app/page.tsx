import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/hearst-connect.svg"
          alt="Hearst Connect"
          className="mx-auto mb-10 h-14 w-auto"
        />
        <p className="eyebrow mb-4">Pre-launch</p>
        <h1 className="h1 text-balance">
          Institutional USDC vault.
          <br />
          <span className="text-[--color-text-muted]">
            Mining-backed structured yield.
          </span>
        </h1>
        <p className="body-md mx-auto mt-6 max-w-lg text-pretty">
          Bitcoin mining cashflow, USDC base yield, and rule-based BTC tactical
          exposure in a single vault. Monthly USDC distributions. Target APY
          range 8–15%. Projection conditional on stated assumptions. Not
          guaranteed.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/admin/roadmap"
            className="rounded-[--radius-button] border border-[--color-border-strong] bg-[--color-bg-elevated] px-4 py-2 text-sm hover:bg-[--color-bg-card]"
          >
            Admin — Roadmap
          </Link>
          <Link
            href="/admin/spec"
            className="rounded-[--radius-button] border border-[--color-border] px-4 py-2 text-sm text-[--color-text-muted] hover:text-[--color-text]"
          >
            Spec
          </Link>
        </div>
      </div>
    </main>
  );
}
