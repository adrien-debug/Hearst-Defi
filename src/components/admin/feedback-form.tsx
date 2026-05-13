"use client";

import { useRef, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { postFeedback } from "@/app/admin/feedback/actions";

export function FeedbackForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      await postFeedback(formData);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="mb-1 block text-[--color-text-dim] uppercase tracking-wide">
            Roadmap item ID (optional)
          </span>
          <input
            name="itemId"
            type="text"
            placeholder="e.g. dash-hero"
            className="w-full rounded border border-[--color-border-strong] bg-[--color-bg-card] px-2 py-1.5 text-sm font-mono"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block text-[--color-text-dim] uppercase tracking-wide">
            Your name (optional)
          </span>
          <input
            name="author"
            type="text"
            placeholder="Adrien"
            className="w-full rounded border border-[--color-border-strong] bg-[--color-bg-card] px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <label className="block text-xs">
        <span className="mb-1 block text-[--color-text-dim] uppercase tracking-wide">
          Pathname or context (optional)
        </span>
        <input
          name="pathname"
          type="text"
          placeholder="/admin/roadmap"
          className="w-full rounded border border-[--color-border-strong] bg-[--color-bg-card] px-2 py-1.5 text-sm font-mono"
        />
      </label>

      <label className="block text-xs">
        <span className="mb-1 block text-[--color-text-dim] uppercase tracking-wide">
          Feedback
        </span>
        <textarea
          name="message"
          rows={4}
          required
          minLength={2}
          placeholder="What works? What doesn't? What's confusing?"
          className="w-full rounded border border-[--color-border-strong] bg-[--color-bg-card] px-2 py-1.5 text-sm"
        />
      </label>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={isPending} size="sm">
          {isPending ? "Sending…" : "Post feedback"}
        </Button>
      </div>
    </form>
  );
}
