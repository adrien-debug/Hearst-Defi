"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { discardWizardDraft } from "../draft-actions";

interface ResumeDraftBannerProps {
  ticker?: string;
  stepLabel: string;
  stepNumber: number;
  updatedAt: Date;
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 min ago";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "1 hr ago";
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return "yesterday";
  return `${diffDays} days ago`;
}

export function ResumeDraftBanner({
  ticker,
  stepLabel,
  stepNumber,
  updatedAt,
}: ResumeDraftBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDiscard() {
    startTransition(async () => {
      await discardWizardDraft();
      router.refresh();
    });
  }

  const draftLabel = ticker ? `${ticker} draft` : "vault draft";
  const relTime = formatRelativeTime(new Date(updatedAt));

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-[var(--ct-radius-lg)] ct-surface-2 border border-[var(--ct-border-soft)]">
      <div className="space-y-0.5">
        <p className="body-sm ct-text-strong">
          Resume {draftLabel} — step {stepNumber}/7: {stepLabel}
        </p>
        <p className="body-xs ct-text-faint">Autosaved {relTime}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={handleDiscard}
          disabled={isPending}
        >
          {isPending ? "Discarding…" : "Discard"}
        </Button>
        <Button
          variant="primary"
          size="sm"
          type="button"
          onClick={() => router.refresh()}
          disabled={isPending}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
