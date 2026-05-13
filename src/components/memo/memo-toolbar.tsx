"use client";

import { cn } from "@/lib/cn";

interface MemoToolbarProps {
  hasMemo: boolean;
  isPending: boolean;
  lastGeneratedAt: string | null;
  onGenerate: () => void;
  onDownload: () => void;
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function MemoToolbar({
  hasMemo,
  isPending,
  lastGeneratedAt,
  onGenerate,
  onDownload,
}: MemoToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isPending}
          className={cn(
            "rounded-[--radius-button] border px-4 py-2 text-sm font-medium",
            "transition-[background-color,color,border-color,opacity] duration-[150ms]",
            "disabled:cursor-not-allowed disabled:opacity-40",
            "border-[--color-brand] bg-[--color-brand] text-[--color-brand-fg]",
            "hover:bg-[--color-brand-strong] hover:border-[--color-brand-strong]",
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
            disabled={isPending}
            className={cn(
              "rounded-[--radius-button] border px-3.5 py-2 text-sm font-medium",
              "transition-[background-color,color,border-color] duration-[150ms]",
              "disabled:cursor-not-allowed disabled:opacity-40",
              "border-[--color-border-strong] bg-transparent text-[--color-text]",
              "hover:bg-[--color-bg-elevated]",
            )}
          >
            Download .md
          </button>
        ) : null}
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
