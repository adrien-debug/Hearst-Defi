export const dynamic = "force-dynamic";

import { MemoShell } from "@/components/memo/memo-shell";

export default function InvestorMemoPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="eyebrow">Institutional export</p>
        <h1 className="h1">Investor Memo</h1>
        <p className="body-sm max-w-2xl">
          Eight sections, generated on demand by Claude Opus 4.7 against the
          current vault snapshot, scenarios, and backtests. Methodology v1.0,
          structured-output enforced (no chat), forbidden-words linted on every
          field. Nothing is auto-distributed — the memo only leaves this page
          when you download it.
        </p>
      </header>

      <MemoShell />

      <footer className="border-t border-[--color-border-subtle] pt-6">
        <p className="body-xs">
          Generated on demand from live vault data. Every export is logged with
          its methodology version. Projections are not a guarantee of future
          results.
        </p>
      </footer>
    </div>
  );
}
