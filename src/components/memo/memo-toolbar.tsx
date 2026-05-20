"use client";

import { Button } from "@/components/ui/button";

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
        <Button
          type="button"
          variant="primary"
          onClick={onGenerate}
          disabled={isPending || isPdfPending}
        >
          {isPending
            ? "Generating…"
            : hasMemo
              ? "Regenerate memo"
              : "Generate memo"}
        </Button>

        {hasMemo ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onDownload}
            disabled={isPending || isPdfPending}
          >
            Download .md
          </Button>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          onClick={onDownloadPdf}
          disabled={isPending || isPdfPending}
        >
          {isPdfPending ? "Generating PDF…" : "Download PDF"}
        </Button>
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
