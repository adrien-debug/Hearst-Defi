"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";

import { Button } from "@/components/ui/button";

/**
 * HeaderConnect — address pill + disconnect button.
 *
 * Two-tier guard to avoid "useWallets called outside the PrivyProvider"
 * warnings during the hydration window: the PrivyProvider is mounted
 * via `dynamic({ ssr: false })`, so for ~50ms after first paint there
 * is no Privy context yet. The outer component only consumes `usePrivy`
 * (which tolerates a missing context); `useWallets` is deferred to the
 * inner component, mounted only when `ready && authenticated`.
 *
 * Address format: `0xAB…CD` (first 6 chars + last 4 chars).
 * Wallet address source: `useWallets()[0].address` (first linked wallet).
 * Falls back to user.email if no wallet is linked (email-only Privy accounts).
 */
export function HeaderConnect() {
  const { ready, authenticated } = usePrivy();
  if (!ready || !authenticated) return null;
  return <HeaderConnectAuthed />;
}

function HeaderConnectAuthed() {
  const { logout, user } = usePrivy();
  const { wallets } = useWallets();

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
            width: "var(--ct-space-1_5)",
            height: "var(--ct-space-1_5)",
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
