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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--ct-space-8)",
        padding: "var(--ct-space-10) var(--ct-space-6)",
        maxWidth: "40rem",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Step wizard — step 4 active, all previous marked done */}
      <StepProgress active="confirmed" />

      {/* Confirmation card */}
      <div
        className="ct-card"
        style={{
          width: "100%",
          maxWidth: "30rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--ct-space-6)",
          textAlign: "center",
        }}
      >
        {/* Success icon */}
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "var(--ct-space-12)",
            height: "var(--ct-space-12)",
            borderRadius: "var(--ct-radius-full)",
            background: "var(--ct-status-success-soft)",
            border: "1px solid var(--ct-status-success-border)",
            boxShadow: "0 0 10px var(--ct-status-success-glow)",
            color: "var(--ct-status-success)",
            flexShrink: 0,
          }}
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
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "var(--ct-space-2)",
            padding: "var(--ct-space-4)",
            borderRadius: "var(--ct-radius-md)",
            background: "var(--ct-surface-1)",
            border: "1px solid var(--ct-border-soft)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--ct-space-3)",
            }}
          >
            <span className="eyebrow" style={{ color: "var(--ct-text-muted)" }}>
              Transaction
            </span>
            <ProvenanceBadge kind="attested" />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--ct-space-3)",
            }}
          >
            <span
              className="tabular"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--ct-text-sm)",
                color: "var(--ct-text-primary)",
              }}
            >
              {hasHash ? abbreviateTx(txHash) : "Pending on-chain confirmation"}
            </span>
            {hasHash && (
              <a
                href={baseScanHref}
                target="_blank"
                rel="noopener noreferrer"
                className="body-xs"
                style={{
                  color: "var(--ct-accent-strong)",
                  textDecoration: "none",
                  fontWeight: "var(--ct-font-medium)",
                  flexShrink: 0,
                  transition: "opacity var(--ct-dur-fast) var(--ct-ease)",
                }}
              >
                View on BaseScan ↗
              </a>
            )}
          </div>
        </div>

        {/* What's next */}
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "var(--ct-space-3)",
            textAlign: "left",
          }}
        >
          <span className="eyebrow" style={{ color: "var(--ct-text-muted)" }}>
            What&apos;s next
          </span>
          <ul
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--ct-space-2)",
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {[
              "Yield begins accruing next epoch (UTC midnight)",
              "First distribution ≈ end of month",
              "Watch /portfolio for live position",
            ].map((item) => (
              <li
                key={item}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "var(--ct-space-2)",
                  fontSize: "var(--ct-text-sm)",
                  color: "var(--ct-text-body)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    marginTop: "var(--ct-space-0_5)",
                    width: "var(--ct-space-1_5)",
                    height: "var(--ct-space-1_5)",
                    borderRadius: "var(--ct-radius-full)",
                    background: "var(--ct-accent)",
                    flexShrink: 0,
                    display: "inline-block",
                  }}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--ct-space-3)",
            width: "100%",
          }}
        >
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
        <p
          className="body-xs"
          style={{
            color: "var(--ct-text-faint)",
            textAlign: "center",
          }}
        >
          APY ranges are target projections — not a commitment of future returns.
          Subject to vault conditions and Methodology v1.0 assumptions.
        </p>
      </div>

      {/* Suppress unused id param warning — id used for back-navigation context */}
      {/* Route: /vaults/{id}/invest/confirmed */}
      <p
        className="body-xs"
        style={{ color: "var(--ct-text-faint)", textAlign: "center" }}
      >
        Vault{" "}
        <span
          className="tabular"
          style={{ fontFamily: "var(--font-mono)", color: "var(--ct-text-muted)" }}
        >
          {id}
        </span>{" "}
        · Hearst Yield Vault
      </p>
    </div>
  );
}
