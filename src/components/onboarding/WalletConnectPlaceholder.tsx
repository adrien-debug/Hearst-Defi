/**
 * WalletConnectPlaceholder — stub for Privy embedded wallet connect (Phase 1).
 *
 * Renders a visually consistent card explaining the wallet binding step.
 * No Privy SDK imported — zero external dependency at this stub stage.
 *
 * Cockpit tokens only. Server Component.
 */

export function WalletConnectPlaceholder() {
  return (
    <div
      className="w-full rounded-[var(--ct-radius-lg)] border border-dashed border-[var(--ct-border-soft)] bg-[var(--ct-surface-1)] p-[var(--ct-space-8)] flex flex-col items-center gap-[var(--ct-space-4)] text-center"
      role="region"
      aria-label="Wallet connection — integration pending"
    >
      {/* Icon placeholder */}
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--ct-surface-2)] border border-[var(--ct-border-soft)]"
        style={{ fontSize: "1.5rem" }}
      >
        🔐
      </span>

      <div className="flex flex-col gap-[var(--ct-space-2)]">
        <h3
          className="h3"
          style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ct-text-primary)" }}
        >
          Connect Your Wallet
        </h3>
        <p className="body-sm ct-text-muted" style={{ maxWidth: "34ch", margin: "0 auto" }}>
          Link your institutional wallet to receive USDC distributions and manage
          your vault position. Supported: MetaMask, Ledger, WalletConnect, Coinbase Wallet.
        </p>
      </div>

      {/* Integration status badge */}
      <span
        className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--ct-radius-full)] border border-[var(--ct-status-warning-border)] bg-[var(--ct-status-warning-soft)] text-[var(--ct-status-warning)] text-[length:var(--ct-text-micro)] font-medium uppercase tracking-[var(--ct-tracking-wide)]"
      >
        <span
          aria-hidden="true"
          className="inline-block w-1.5 h-1.5 rounded-full bg-current"
        />
        Privy integration — P1
      </span>

      {/* Privy widget mount point */}
      <div
        id="privy-wallet-container"
        data-testid="privy-wallet-placeholder"
        className="w-full min-h-[160px] rounded-[var(--ct-radius-md)] border border-[var(--ct-border-soft)] bg-[var(--ct-surface-0)] flex items-center justify-center"
      >
        <span className="body-xs ct-text-faint">
          Privy wallet widget will mount here in P1
        </span>
      </div>

      <p className="body-xs ct-text-faint text-center text-pretty">
        Wallet binding is used solely for on-chain distribution delivery.
        No private keys are stored or transmitted.
      </p>
    </div>
  );
}
