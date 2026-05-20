"use client";

import { usePrivy, useWallets, useLogin } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { safeFrom } from "@/lib/safe-redirect";

export function HeaderConnect() {
  const { ready, authenticated } = usePrivy();
  if (!ready) return null;
  if (!authenticated) return <HeaderConnectGuest />;
  return <HeaderConnectAuthed />;
}

function HeaderConnectGuest() {
  const router = useRouter();
  const { login } = useLogin({
    // useRouter + window.location.search: header is in root layout without Suspense — useSearchParams would warn
    onComplete: () => {
      const from = new URLSearchParams(window.location.search).get("from");
      router.push(safeFrom(from, window.location.pathname));
    },
  });

  return (
    <Button variant="primary" size="sm" onClick={() => login()}>
      Connect Wallet
    </Button>
  );
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
      <span className="ct-pill">
        <span
          className="ct-status-dot-success w-1.5 h-1.5 shrink-0 rounded-full"
          aria-hidden="true"
        />
        <span className="tabular">
          {displayAddress}
        </span>
      </span>

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
