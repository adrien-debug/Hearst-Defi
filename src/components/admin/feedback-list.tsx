"use client";

import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { toggleResolved } from "@/app/admin/feedback/actions";

interface FeedbackItem {
  id: string;
  createdAt: Date;
  itemId: string | null;
  pathname: string | null;
  message: string;
  author: string | null;
  resolved: boolean;
}

export function FeedbackList({ items }: { items: FeedbackItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[--ct-border] px-4 py-8 text-center text-sm text-[--ct-text-muted]">
        No feedback yet. Be the first.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <FeedbackRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function FeedbackRow({ item }: { item: FeedbackItem }) {
  const [isPending, startTransition] = useTransition();

  function onToggle() {
    startTransition(async () => {
      await toggleResolved(item.id, !item.resolved);
    });
  }

  return (
    <Card className={cn("p-4", item.resolved && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[--ct-text-muted]">
            <time>{item.createdAt.toISOString().slice(0, 16).replace("T", " ")}</time>
            {item.author ? <span>· {item.author}</span> : null}
            {item.itemId ? (
              <Badge variant="default">item: {item.itemId}</Badge>
            ) : null}
            {item.pathname ? (
              <span className="font-mono">{item.pathname}</span>
            ) : null}
            {item.resolved ? <Badge variant="success">Resolved</Badge> : null}
          </div>
          <p className="whitespace-pre-wrap text-sm text-[--ct-text-body]">
            {item.message}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          disabled={isPending}
        >
          {item.resolved ? "Reopen" : "Resolve"}
        </Button>
      </div>
    </Card>
  );
}
