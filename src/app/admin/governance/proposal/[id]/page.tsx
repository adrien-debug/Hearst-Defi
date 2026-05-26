import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { loadProposalDetail } from "@/lib/governance/actions";
import { executeProposal, signProposal } from "@/lib/governance/actions";
import type { ProposalState } from "@/lib/governance/state-machine";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Helpers (duplicated from queue page — small, no extraction warranted)
// ---------------------------------------------------------------------------

function stateVariant(
  state: ProposalState,
): "default" | "warning" | "success" | "danger" | "accent" {
  switch (state) {
    case "DRAFT":
      return "default";
    case "SIGNING":
      return "warning";
    case "QUEUED":
    case "TIMELOCK":
      return "accent";
    case "EXECUTABLE":
    case "EXECUTED":
      return "success";
    case "CANCELLED":
    case "REJECTED":
    case "EXPIRED":
      return "danger";
  }
}

function stateLabel(state: ProposalState): string {
  return state.charAt(0) + state.slice(1).toLowerCase();
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function timelockCountdown(etaAt: Date): string {
  const ms = etaAt.getTime() - Date.now();
  if (ms <= 0) return "Elapsed — ready to execute";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m remaining`;
}

// ---------------------------------------------------------------------------
// Server Actions (thin wrappers bound to this proposal's id)
// ---------------------------------------------------------------------------

async function handleSign(
  proposalId: string,
  decision: "approve" | "reject" | "cancel",
  formData: FormData,
) {
  "use server";
  const reason = (formData.get("reason") as string | null) ?? undefined;
  await signProposal(proposalId, decision, reason);
}

async function handleExecute(proposalId: string) {
  "use server";
  await executeProposal(proposalId);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProposalDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  let proposal;
  try {
    proposal = await loadProposalDetail(id);
  } catch {
    notFound();
  }

  const isTerminal = ["EXECUTED", "CANCELLED", "REJECTED", "EXPIRED"].includes(proposal.state);
  const canSign = proposal.state === "SIGNING";
  const canCancel = proposal.state === "TIMELOCK" || proposal.state === "QUEUED";
  const canExecute = proposal.state === "EXECUTABLE" || proposal.state === "TIMELOCK";

  const approveAction = handleSign.bind(null, proposal.id, "approve");
  const rejectAction = handleSign.bind(null, proposal.id, "reject");
  const cancelAction = handleSign.bind(null, proposal.id, "cancel");
  const executeAction = handleExecute.bind(null, proposal.id);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={`Proposal — ${proposal.actionType}`}
        actions={
          <Button variant="secondary" asChild size="md">
            <Link href="/admin/governance">← Back to queue</Link>
          </Button>
        }
      />

      {/* Meta card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="ct-pill text-xs font-mono">{proposal.vaultTicker}</span>
            <span className="body-md ct-text-strong font-semibold">{proposal.actionType}</span>
          </div>
          <Badge variant={stateVariant(proposal.state)}>{stateLabel(proposal.state)}</Badge>
        </CardHeader>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="ct-text-muted text-xs uppercase tracking-[var(--ct-tracking-wide)]">Proposed by</dt>
            <dd className="font-mono ct-text-primary mt-0.5">{proposal.proposedBy}</dd>
          </div>
          <div>
            <dt className="ct-text-muted text-xs uppercase tracking-[var(--ct-tracking-wide)]">Required signers</dt>
            <dd className="ct-text-primary mt-0.5">{proposal.requiredSigners}</dd>
          </div>
          <div>
            <dt className="ct-text-muted text-xs uppercase tracking-[var(--ct-tracking-wide)]">Created</dt>
            <dd className="ct-text-primary mt-0.5 tabular-nums">{formatDate(proposal.createdAt)}</dd>
          </div>
          <div>
            <dt className="ct-text-muted text-xs uppercase tracking-[var(--ct-tracking-wide)]">ETA (timelock)</dt>
            <dd className="ct-text-primary mt-0.5 tabular-nums">{formatDate(proposal.etaAt)}</dd>
          </div>
          {proposal.executedAt && (
            <div>
              <dt className="ct-text-muted text-xs uppercase tracking-[var(--ct-tracking-wide)]">Executed at</dt>
              <dd className="ct-text-primary mt-0.5 tabular-nums">{formatDate(proposal.executedAt)}</dd>
            </div>
          )}
          {proposal.cancelledAt && (
            <div>
              <dt className="ct-text-muted text-xs uppercase tracking-[var(--ct-tracking-wide)]">Cancelled at</dt>
              <dd className="ct-text-primary mt-0.5 tabular-nums">{formatDate(proposal.cancelledAt)}</dd>
            </div>
          )}
        </dl>

        {/* Timelock countdown */}
        {proposal.state === "TIMELOCK" && proposal.etaAt && (
          <div className="mt-6 pt-4 border-t border-[var(--ct-border-soft)] rounded-[var(--ct-radius-md)] bg-[var(--ct-surface-1)] px-4 py-3">
            <p className="text-xs ct-text-muted mb-1 uppercase tracking-[var(--ct-tracking-wide)]">
              Timelock countdown
            </p>
            <p className="ct-text-strong font-mono text-sm">
              {timelockCountdown(proposal.etaAt)}
            </p>
          </div>
        )}
      </Card>

      {/* Justification */}
      <Card>
        <h2 className="h2 mb-3">Justification</h2>
        <p className="body-md ct-text-primary whitespace-pre-wrap">{proposal.justification}</p>
      </Card>

      {/* Calldata diff */}
      {proposal.calldata && (
        <Card>
          <h2 className="h2 mb-3">Calldata</h2>
          <pre className="ct-text-muted text-xs font-mono bg-[var(--ct-surface-1)] p-4 rounded-[var(--ct-radius-md)] overflow-x-auto whitespace-pre-wrap">
            {(() => {
              try {
                return JSON.stringify(JSON.parse(proposal.calldata), null, 2);
              } catch {
                return proposal.calldata;
              }
            })()}
          </pre>
        </Card>
      )}

      {/* Signatures */}
      <Card>
        <h2 className="h2 mb-4">
          Signatures ({proposal.approvalCount}/{proposal.requiredSigners} approved
          {proposal.rejectionCount > 0 ? `, ${proposal.rejectionCount} rejected` : ""}
          {proposal.cancelCount > 0 ? `, ${proposal.cancelCount} cancel` : ""})
        </h2>

        {proposal.signatures.length === 0 ? (
          <p className="body-sm ct-text-muted">No signatures yet.</p>
        ) : (
          <div className="space-y-2">
            {proposal.signatures.map((sig) => (
              <div
                key={sig.id}
                className="flex items-center gap-3 py-2 border-b border-[var(--ct-border-soft)] last:border-0"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background:
                      sig.decision === "approve"
                        ? "var(--ct-status-success-soft)"
                        : sig.decision === "reject"
                          ? "var(--ct-status-danger-soft)"
                          : "var(--ct-surface-2)",
                    color:
                      sig.decision === "approve"
                        ? "var(--ct-status-success)"
                        : sig.decision === "reject"
                          ? "var(--ct-status-danger)"
                          : "var(--ct-text-muted)",
                  }}
                >
                  {sig.decision === "approve" ? "✓" : sig.decision === "reject" ? "✗" : "⊘"}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs ct-text-primary">{sig.signerAddress}</span>
                  {sig.reason && (
                    <p className="text-xs ct-text-muted mt-0.5 truncate">{sig.reason}</p>
                  )}
                </div>
                <span className="text-xs ct-text-muted tabular-nums shrink-0">
                  {formatDate(sig.signedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Actions */}
      {!isTerminal && (
        <Card>
          <h2 className="h2 mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {canSign && (
              <>
                <form action={approveAction}>
                  <input type="hidden" name="reason" value="" />
                  <Button variant="primary" size="lg" type="submit">
                    Approve
                  </Button>
                </form>
                <form action={rejectAction}>
                  <input type="hidden" name="reason" value="" />
                  <Button variant="danger" size="lg" type="submit">
                    Reject
                  </Button>
                </form>
              </>
            )}

            {canCancel && (
              <form action={cancelAction}>
                <input type="hidden" name="reason" value="" />
                <Button variant="danger" size="lg" type="submit">
                  Cancel (quorum)
                </Button>
              </form>
            )}

            {canExecute && (
              <form action={executeAction}>
                <Button variant="primary" size="lg" type="submit">
                  Execute
                </Button>
              </form>
            )}
          </div>

          <p className="mt-3 text-xs ct-text-muted">
            Actions are recorded on-chain mock only — no Solidity calls at this stage.
          </p>
        </Card>
      )}
    </div>
  );
}
