"use client";

// PreFlightCheck — 4 checks: Wallet · Network · Allowance · Epoch
// All stubs at MVP. Real wiring deferred to sc-dev contract phase.
// Non-negotiable #5: no forbidden words in copy.

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { stubApprove, stubEpoch, abbreviateAddress, type EpochStatus } from "@/lib/onchain";

interface CheckRowProps {
  label: string;
  status: "ok" | "pending" | "action";
  detail: string;
  action?: React.ReactNode;
}

function CheckRow({ label, status, detail, action }: CheckRowProps) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {/* Status dot */}
      <span
        aria-hidden
        className={cn(
          "mt-0.5 h-2 w-2 rounded-full shrink-0",
          status === "ok" && "ct-status-dot-success",
          status === "action" && "ct-status-dot-warning",
          status === "pending" && "ct-status-dot-info",
        )}
      />
      <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <span className="body-sm font-semibold ct-text-primary">{label}</span>
          <span className="body-xs ct-text-muted ml-2">{detail}</span>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

interface PreFlightCheckProps {
  walletAddress: string | null;
  amount: number;
  vaultId: string;
  onAllowanceApproved: () => void;
  allowanceApproved: boolean;
  approving: boolean;
  onApproveStart: () => void;
  onApproveEnd: () => void;
}

export function PreFlightCheck({
  walletAddress,
  amount,
  vaultId,
  onAllowanceApproved,
  allowanceApproved,
  approving,
  onApproveStart,
  onApproveEnd,
}: PreFlightCheckProps) {
  const epoch = stubEpoch();

  async function handleApprove() {
    onApproveStart();
    try {
      await stubApprove({ vaultId, amount });
      onAllowanceApproved();
    } finally {
      onApproveEnd();
    }
  }

  const epochStatusLabel: Record<EpochStatus, string> = {
    ACTIVE: "Active",
    ENDING: "Ending soon",
    SYNC: "Sync in progress",
  };

  const walletOk = walletAddress !== null;
  const networkOk = true; // MVP display-only
  const allowanceOk = allowanceApproved;
  const epochOk = epoch.status === "ACTIVE";

  return (
    <div className="ct-card divide-y divide-[--ct-border-soft]">
      <p className="eyebrow pb-3 pt-1">Pre-flight check</p>

      {/* 1 — Wallet */}
      <CheckRow
        label="Wallet"
        status={walletOk ? "ok" : "action"}
        detail={
          walletOk
            ? abbreviateAddress(walletAddress!)
            : "No wallet connected"
        }
      />

      {/* 2 — Network */}
      <CheckRow
        label="Network"
        status={networkOk ? "ok" : "action"}
        detail="Base Sepolia"
      />

      {/* 3 — Allowance */}
      <CheckRow
        label="Allowance"
        status={allowanceOk ? "ok" : "action"}
        detail={
          allowanceOk
            ? `USDC approved`
            : amount > 0
              ? `Approve $${amount.toLocaleString("en-US")} USDC`
              : "Enter amount first"
        }
        action={
          !allowanceOk && amount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleApprove}
              disabled={approving}
              className="border border-[--ct-border-accent] text-[--ct-accent] hover:bg-[--ct-accent-soft]"
            >
              {approving ? "Approving…" : "Approve"}
            </Button>
          ) : undefined
        }
      />

      {/* 4 — Epoch */}
      <CheckRow
        label="Epoch"
        status={epochOk ? "ok" : "pending"}
        detail={`${epochStatusLabel[epoch.status]} · closes in ${epoch.endsInDays}d`}
      />
    </div>
  );
}

// Exported helper — tells parent if pre-flight is complete
export function isPreFlightReady(
  walletAddress: string | null,
  allowanceApproved: boolean,
  epoch: { status: EpochStatus },
): boolean {
  return walletAddress !== null && allowanceApproved && epoch.status === "ACTIVE";
}
