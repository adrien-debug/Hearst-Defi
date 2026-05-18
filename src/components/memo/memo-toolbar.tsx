"use client";

import { cn } from "@/lib/cn";

interface MemoToolbarProps {
  hasMemo: boolean;
  isPending: boolean;
  isPdfPending: boolean;
  lastGeneratedAt: string | null;
  onGenerate: () => void;
  onDownload: () => void;
  onDownloadPdf: () => void;
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function MemoToolbar({
  hasMemo,
  isPending,
  isPdfPending,
  lastGeneratedAt,
  onGenerate,
  onDownload,
  onDownloadPdf,
}: MemoToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isPending || isPdfPending}
          className={cn(
            "rounded-[--radius-button] border px-4 py-2 text-sm font-medium",
            "transition-[background-color,color,border-color,opacity] duration-[150ms]",
            "disabled:cursor-not-allowed disabled:opacity-40",
            "border-[--ct-text-strong] bg-[--ct-text-strong] text-[--ct-bg-deep]",
            "hover:bg-[--ct-text-strong] hover:border-[--ct-text-strong]",
          )}
        >
          {isPending
            ? "Generating…"
            : hasMemo
              ? "Regenerate memo"
              : "Generate memo"}
        </button>

        {hasMemo ? (
          <button
            type="button"
            onClick={onDownload}
            disabled={isPending || isPdfPending}
            className={cn(
              "rounded-[--radius-button] border px-3.5 py-2 text-sm font-medium",
              "transition-[background-color,color,border-color] duration-[150ms]",
              "disabled:cursor-not-allowed disabled:opacity-40",
              "border-[--ct-border-strong] bg-transparent text-[--ct-text-primary]",
              "hover:bg-[--ct-surface-1]",
            )}
          >
            Download .md
          </button>
        ) : null}

        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={isPending || isPdfPending}
          className={cn(
            "rounded-[--radius-button] border px-3.5 py-2 text-sm font-medium",
            "transition-[background-color,color,border-color] duration-[150ms]",
            "disabled:cursor-not-allowed disabled:opacity-40",
            "border-[--ct-border-strong] bg-transparent text-[--ct-text-primary]",
            "hover:bg-[--ct-surface-1]",
          )}
        >
          {isPdfPending ? "Generating PDF…" : "Download PDF"}
        </button>
      </div>

      <div className="text-right">
        {lastGeneratedAt ? (
          <span className="body-xs">
            Last generated · {dateFmt.format(new Date(lastGeneratedAt))} UTC
          </span>
        ) : (
          <span className="body-xs">Not yet generated</span>
        )}
      </div>
    </div>
  );
}
