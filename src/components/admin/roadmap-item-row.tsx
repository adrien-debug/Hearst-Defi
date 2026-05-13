"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  statusDotColor,
  statusLabel,
  type RoadmapItemWithState,
  type RoadmapStatus,
} from "@/lib/roadmap-types";
import {
  quickSetStatus,
  updateRoadmapItem,
} from "@/app/admin/roadmap/actions";

const STATUSES: RoadmapStatus[] = [
  "todo",
  "in_progress",
  "done",
  "blocked",
  "validated",
];

export function RoadmapItemRow({ item }: { item: RoadmapItemWithState }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function setStatus(next: RoadmapStatus) {
    startTransition(async () => {
      await quickSetStatus(item.id, next);
    });
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      await updateRoadmapItem(formData);
      setOpen(false);
    });
  }

  return (
    <div className="rounded-md border border-[--color-border] bg-[--color-bg-elevated]/60">
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: statusDotColor(item.status) }}
          title={statusLabel(item.status)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm">{item.label}</span>
            <Badge variant="default">{item.owner}</Badge>
            {item.evidenceUrl ? (
              <a
                href={item.evidenceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[--color-brand] underline-offset-2 hover:underline"
              >
                Evidence ↗
              </a>
            ) : null}
            {item.blockers ? <Badge variant="danger">Blocker</Badge> : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[--color-text-dim]">
            <span className="font-mono">{item.id}</span>
            {item.spec_ref ? (
              <span className="font-mono text-[--color-text-muted]">
                · {item.spec_ref}
              </span>
            ) : null}
            {item.validatedBy ? (
              <span>
                · Validated by {item.validatedBy}
                {item.validatedAt
                  ? ` on ${item.validatedAt.toISOString().slice(0, 10)}`
                  : ""}
              </span>
            ) : null}
          </div>
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              disabled={isPending || item.status === s}
              className={`rounded px-2 py-1 text-xs transition-colors ${
                item.status === s
                  ? "bg-[--color-bg-card] text-[--color-text]"
                  : "text-[--color-text-dim] hover:bg-[--color-bg-card] hover:text-[--color-text]"
              } disabled:cursor-default disabled:opacity-50`}
              title={statusLabel(s)}
              aria-label={`Set status to ${statusLabel(s)}`}
            >
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: statusDotColor(s) }}
              />
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? "Close" : "Details"}
        </Button>
      </div>

      {open ? (
        <form
          action={onSubmit}
          className="space-y-3 border-t border-[--color-border] p-4"
        >
          <input type="hidden" name="itemId" value={item.id} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="mb-1 block text-[--color-text-dim] uppercase tracking-wide">
                Status
              </span>
              <select
                name="status"
                defaultValue={item.status}
                className="w-full rounded border border-[--color-border-strong] bg-[--color-bg-card] px-2 py-1.5 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs">
              <span className="mb-1 block text-[--color-text-dim] uppercase tracking-wide">
                Validated by
              </span>
              <input
                name="validatedBy"
                type="text"
                defaultValue={item.validatedBy ?? ""}
                placeholder="Adrien"
                className="w-full rounded border border-[--color-border-strong] bg-[--color-bg-card] px-2 py-1.5 text-sm"
              />
            </label>
          </div>

          <label className="block text-xs">
            <span className="mb-1 block text-[--color-text-dim] uppercase tracking-wide">
              Evidence URL
            </span>
            <input
              name="evidenceUrl"
              type="url"
              defaultValue={item.evidenceUrl ?? ""}
              placeholder="https://… preview, PR, screenshot"
              className="w-full rounded border border-[--color-border-strong] bg-[--color-bg-card] px-2 py-1.5 text-sm font-mono"
            />
          </label>

          <label className="block text-xs">
            <span className="mb-1 block text-[--color-text-dim] uppercase tracking-wide">
              Notes
            </span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={item.notes ?? ""}
              className="w-full rounded border border-[--color-border-strong] bg-[--color-bg-card] px-2 py-1.5 text-sm"
            />
          </label>

          <label className="block text-xs">
            <span className="mb-1 block text-[--color-text-dim] uppercase tracking-wide">
              Blockers
            </span>
            <textarea
              name="blockers"
              rows={2}
              defaultValue={item.blockers ?? ""}
              placeholder="What's blocking this?"
              className="w-full rounded border border-[--color-border-strong] bg-[--color-bg-card] px-2 py-1.5 text-sm"
            />
          </label>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isPending}
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
