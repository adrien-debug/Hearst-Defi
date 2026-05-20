"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";

import { Button } from "@/components/ui/button";

/**
 * HeaderConnect — address pill + disconnect button.
 *
 * Rendered only when Privy reports `authenticated: true`.
 * Returns null otherwise — safe to mount unconditionally in (product)/layout.
 *
 * Address format: `0xAB…CD` (first 6 chars + last 4 chars).
 * Wallet address source: `useWallets()[0].address` (first linked wallet).
 * Falls back to user.email if no wallet is linked (email-only Privy accounts).
 */
export function HeaderConnect() {
  const { ready, authenticated, logout, user } = usePrivy();
  const { wallets } = useWallets();

  if (!ready || !authenticated) return null;

  // Resolve display address: prefer first wallet, fall back to email identifier.
  const walletAddress = wallets[0]?.address ?? null;
  const displayAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : (user?.email?.address ?? user?.id?.slice(0, 12) ?? "—");

  return (
    <div className="flex items-center gap-2">
      {/* Status + address pill */}
      <span className="ct-pill flex items-center gap-1.5">
        <span
          className="ct-status-dot-success"
          style={{
            display: "inline-block",
            width: "6px",
            height: "6px",
            borderRadius: "var(--ct-radius-full)",
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        <span className="eyebrow" style={{ textTransform: "none", marginBottom: 0 }}>
          {displayAddress}
        </span>
      </span>

      {/* Disconnect */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void logout()}
        aria-label="Disconnect wallet"
      >
        Disconnect
      </Button>
    </div>
  );
}
