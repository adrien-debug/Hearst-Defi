"use client";

// PositionActions — self-served redemption (withdraw) for /portfolio/[positionId].
// Client Component. Testnet ERC-4626 redeem path:
//   connect wallet → redeem(all shares) on Base Sepolia → record withdrawal → confirmation.
// Non-negotiable #5: no forbidden words in copy.
//
// Wallet connect is via Privy (same as the deposit flow). When Privy is not
// configured, the connect state is shown — never a simulated transaction.

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";

import { Button } from "@/components/ui/button";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import {
  redeemFromVault,
  readMaxRedeem,
  walletClientFromProvider,
  VAULT_ADDRESS,
  ConfigError,
  ChainError,
  type RedeemFromVaultResult,
} from "@/lib/onchain/vault";
import { redeem } from "@/app/actions/redeem";
import type { PositionDetail } from "@/lib/data/portfolio";

interface PositionActionsProps {
  position: PositionDetail;
}

type Phase = "idle" | "redeeming" | "recording" | "done" | "error";

function shortHash(h: string): string {
  return h.length > 12 ? `${h.slice(0, 6)}…${h.slice(-4)}` : h;
}

export function PositionActions({ position }: PositionActionsProps) {
  const router = useRouter();
  const { ready } = usePrivy();
  const { wallets } = useWallets();
  const privyWallet = wallets[0] ?? null;
  const walletAddress = privyWallet?.address ?? null;

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RedeemFromVaultResult | null>(null);

  const handleWithdraw = useCallback(async () => {
    setError(null);
    if (!VAULT_ADDRESS) {
      setError("Vault address not configured.");
      setPhase("error");
      return;
    }
    if (!ready || !privyWallet || walletAddress === null) {
      setError("Connect your wallet to withdraw.");
      setPhase("error");
      return;
    }

    try {
      const owner = walletAddress as `0x${string}`;
      const shares = await readMaxRedeem(owner);
      if (shares === 0n) {
        setError("No redeemable vault shares for this wallet.");
        setPhase("error");
        return;
      }

      setPhase("redeeming");
      const provider = await privyWallet.getEthereumProvider();
      const wc = walletClientFromProvider(provider, owner);
      const res = await redeemFromVault({
        walletClient: wc,
        shares,
        receiver: owner,
        owner,
      });
      setResult(res);

      // Record the off-chain side: close/reduce the DB position + transaction.
      setPhase("recording");
      const assets = res.assetsUsdc > 0 ? res.assetsUsdc : position.principalUsdc;
      const recorded = await redeem(position.id, assets, res.txHash);
      if (!recorded.ok) {
        setError(`On-chain redemption succeeded but recording failed: ${recorded.error}`);
        setPhase("error");
        return;
      }

      setPhase("done");
      router.refresh();
    } catch (e) {
      if (e instanceof ConfigError || e instanceof ChainError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : "Redemption failed.");
      }
      setPhase("error");
    }
  }, [ready, privyWallet, walletAddress, position.id, position.principalUsdc, router]);

  if (position.status !== "active") return null;

  if (phase === "done" && result) {
    return (
      <section aria-label="Redemption confirmed" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="body-sm ct-text-strong">Redemption confirmed</span>
          <ProvenanceBadge kind="manual" />
        </div>
        <p className="body-xs ct-text-muted">
          ~${result.assetsUsdc.toLocaleString("en-US")} USDC redeemed. Your
          position is now closed.
        </p>
        <a
          href={`https://sepolia.basescan.org/tx/${result.txHash}`}
          target="_blank"
          rel="noreferrer noopener"
          className="body-xs text-[var(--ct-accent-strong)] no-underline hover:underline font-medium"
        >
          {shortHash(result.txHash)} — view on BaseScan (Sepolia) ↗
        </a>
      </section>
    );
  }

  const busy = phase === "redeeming" || phase === "recording";
  const connected = ready && walletAddress !== null;

  return (
    <section aria-label="Position actions" className="flex flex-col gap-3">
      <p className="body-xs ct-text-muted">
        Withdraw redeems all your vault shares for USDC on Base Sepolia (testnet),
        subject to the 60-day soft lock-up. Past performance does not predict
        future results.
      </p>
      <Button
        type="button"
        variant="primary"
        size="lg"
        disabled={busy || !connected}
        onClick={handleWithdraw}
        className="font-semibold"
      >
        {phase === "redeeming"
          ? "Confirm in wallet…"
          : phase === "recording"
            ? "Recording…"
            : connected
              ? "Withdraw all (redeem)"
              : "Connect wallet to withdraw"}
      </Button>
      {error !== null && (
        <p role="alert" className="body-xs text-[var(--ct-status-danger)]">
          {error}
        </p>
      )}
    </section>
  );
}
