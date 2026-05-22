// /vaults/[id]/invest/confirmed — Step 4 of 4: Deposit confirmed
// Server Component. Reads searchParams.tx + searchParams.amount.
// Non-negotiable #2: ProvenanceBadge on transaction metric.
// Non-negotiable #5: no forbidden words in copy.
// Non-negotiable #10: "not guaranteed" disclaimer.

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { StepProgress } from "@/components/vaults/step-progress";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deposit Confirmed — Hearst Yield Vault",
};

// Next.js 16 App Router — params + searchParams are Promises
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tx?: string; amount?: string; positionId?: string }>;
}

/** Abbreviate a tx hash: 0x + first 4 + … + last 4 chars. */
function abbreviateTx(hash: string): string {
  if (hash.length < 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

/** Format amount as USD integer (e.g. "500,000"). */
function fmtUsdc(raw: string | undefined): string {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (isNaN(n) || n <= 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function ConfirmedPage({ params, searchParams }: PageProps) {
  // Await both in parallel — independent promises
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const txHash = sp.tx ?? null;
  const amount = fmtUsdc(sp.amount);
  const positionId = sp.positionId ?? null;

  const hasHash = txHash && txHash.length > 6;
  const baseScanHref = hasHash
    ? `https://basescan.org/tx/${txHash}`
    : "https://basescan.org";

  return (
    <div className="flex flex-col items-center gap-8 px-6 py-10 max-w-2xl mx-auto w-full">
      {/* Step wizard — step 4 active, all previous marked done */}
      <StepProgress active="confirmed" />

      {/* Confirmation card */}
      <div className="ct-card w-full max-w-lg flex flex-col items-center gap-6 text-center">
        {/* Success icon */}
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[--ct-status-success-soft] border border-[--ct-status-success-border] shadow-[var(--ct-glow-soft)] text-[--ct-status-success] shrink-0"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 14l6 6 10-10"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <div className="flex flex-col gap-[var(--ct-space-2)]">
          <h1 className="h1 ct-text-strong">
            Deposit confirmed
          </h1>
          <p className="body-md ct-text-body">
            {amount !== "—"
              ? `${amount} USDC deposited into Hearst Yield Vault.`
              : "Your USDC has been deposited into Hearst Yield Vault."}
          </p>
        </div>

        {/* Transaction row */}
        <div className="w-full flex flex-col gap-2 p-4 rounded-[--ct-radius-md] bg-[--ct-surface-1] border border-[--ct-border-soft]">
          <div className="flex items-center justify-between gap-3">
            <span className="eyebrow ct-text-muted">
              Transaction
            </span>
            <ProvenanceBadge kind="attested" />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="tabular mono text-sm ct-text-primary">
              {hasHash ? abbreviateTx(txHash) : "Pending on-chain confirmation"}
            </span>
            {hasHash && (
              <a
                href={baseScanHref}
                target="_blank"
                rel="noopener noreferrer"
                className="body-xs text-[--ct-accent-strong] no-underline font-medium shrink-0 transition-opacity duration-150 hover:opacity-80"
              >
                View on BaseScan ↗
              </a>
            )}
          </div>
        </div>

        {/* What's next */}
        <div className="w-full flex flex-col gap-3 text-left">
          <span className="eyebrow ct-text-muted">
            What&apos;s next
          </span>
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {[
              "Yield begins accruing next epoch (UTC midnight)",
              "First distribution ≈ end of month",
              "Watch /portfolio for live position",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm ct-text-body"
              >
                <span
                  aria-hidden="true"
                  className="inline-block mt-0.5 w-1.5 h-1.5 rounded-full bg-[--ct-accent] shrink-0"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 w-full">
          <Button variant="primary" size="lg" asChild className="w-full font-bold">
            <Link href={positionId ? `/portfolio/${positionId}` : "/portfolio"}>
              Go to Portfolio
            </Link>
          </Button>
          <Button variant="ghost" size="md" asChild className="w-full">
            <Link href="/vaults">Subscribe to another vault</Link>
          </Button>
        </div>

        {/* Disclaimer — non-negotiable #10 */}
        <p className="body-xs ct-text-faint text-center">
          APY ranges are target projections — not a commitment of future returns.
          Subject to vault conditions and Methodology v1.0 assumptions.
        </p>
      </div>

      {/* Suppress unused id param warning — id used for back-navigation context */}
      {/* Route: /vaults/{id}/invest/confirmed */}
      <p className="body-xs ct-text-faint text-center">
        Vault{" "}
        <span className="tabular mono ct-text-muted">
          {id}
        </span>{" "}
        · Hearst Yield Vault
      </p>
    </div>
  );
}
