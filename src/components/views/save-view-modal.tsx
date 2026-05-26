"use client";

/**
 * SaveViewModal — "Save as…" modal.
 * Collects: name (required), scope (auto-detected from current route, editable),
 * visibility (private | team).  On submit calls onSave with the payload.
 */

import { useId, useState, useTransition } from "react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ViewScope, ViewVisibility } from "@/lib/views/templates";

const SCOPE_OPTIONS: { value: ViewScope; label: string }[] = [
  { value: "vaults", label: "Vaults" },
  { value: "distributions", label: "Distributions" },
  { value: "proofs", label: "Proofs" },
  { value: "investors", label: "Investors" },
  { value: "signers", label: "Signers" },
  { value: "memos", label: "Memos" },
  { value: "events", label: "Events" },
];

const VISIBILITY_OPTIONS: { value: ViewVisibility; label: string }[] = [
  { value: "private", label: "Private (only me)" },
  { value: "team", label: "Team (all admins)" },
];

export interface SaveViewPayload {
  name: string;
  scope: ViewScope;
  visibility: ViewVisibility;
}

export interface SaveViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-selected scope (from current route context). */
  defaultScope: ViewScope;
  /** Async save handler — called with the validated payload. */
  onSave: (payload: SaveViewPayload) => Promise<void>;
}

export function SaveViewModal({
  isOpen,
  onClose,
  defaultScope,
  onSave,
}: SaveViewModalProps) {
  const nameId = useId();
  const scopeId = useId();
  const visibilityId = useId();

  const [name, setName] = useState("");
  const [scope, setScope] = useState<ViewScope>(defaultScope);
  const [visibility, setVisibility] = useState<ViewVisibility>("private");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    if (isPending) return;
    setName("");
    setScope(defaultScope);
    setVisibility("private");
    setError(null);
    onClose();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await onSave({ name: trimmed, scope, visibility });
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed.");
      }
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Save view"
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={nameId}
            className="text-xs font-medium text-[var(--ct-text-muted)]"
          >
            Name <span aria-hidden="true" className="text-[var(--ct-status-danger)]">*</span>
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="e.g. Live vaults — high AUM"
            aria-required="true"
            aria-invalid={error != null ? "true" : undefined}
            disabled={isPending}
            className={cn(
              "h-8 rounded-[var(--ct-radius-md)] border px-3 text-xs",
              "bg-[var(--ct-surface-1)] text-[var(--ct-text-primary)]",
              "placeholder:text-[var(--ct-text-faded)]",
              "focus:outline-none focus:shadow-[var(--ct-shadow-focus-ring)]",
              "transition-[border-color]",
              error
                ? "border-[var(--ct-status-danger-border)]"
                : "border-[var(--ct-border-soft)] hover:border-[var(--ct-border-strong)]",
            )}
          />
          {error && (
            <p
              role="alert"
              className="text-xs text-[var(--ct-status-danger)]"
            >
              {error}
            </p>
          )}
        </div>

        {/* Scope */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={scopeId}
            className="text-xs font-medium text-[var(--ct-text-muted)]"
          >
            Scope
          </label>
          <select
            id={scopeId}
            value={scope}
            onChange={(e) => setScope(e.target.value as ViewScope)}
            disabled={isPending}
            className={cn(
              "h-8 appearance-none rounded-[var(--ct-radius-md)] border",
              "border-[var(--ct-border-soft)] bg-[var(--ct-surface-1)]",
              "px-3 text-xs text-[var(--ct-text-primary)]",
              "focus:outline-none focus:shadow-[var(--ct-shadow-focus-ring)]",
              "hover:border-[var(--ct-border-strong)]",
              "transition-[border-color]",
            )}
          >
            {SCOPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Visibility */}
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs font-medium text-[var(--ct-text-muted)]">
            Visibility
          </legend>
          <div className="flex flex-col gap-1.5 pt-0.5" id={visibilityId}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 text-xs text-[var(--ct-text-primary)]"
              >
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={visibility === opt.value}
                  onChange={() => setVisibility(opt.value)}
                  disabled={isPending}
                  className="accent-[var(--ct-accent)]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save view"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
