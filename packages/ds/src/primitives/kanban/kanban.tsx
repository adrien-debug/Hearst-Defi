"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";

import type {
  KanbanCardProps,
  KanbanColumnProps,
  KanbanProps,
} from "./kanban.types";

interface KanbanCtx {
  draggingId: string | null;
  setDragging: (id: string | null) => void;
  draggingFrom: string | null;
  setDraggingFrom: (col: string | null) => void;
  onMove?: KanbanProps["onMove"];
  hoverCol: string | null;
  setHoverCol: (col: string | null) => void;
}

const KanbanContext = React.createContext<KanbanCtx | null>(null);

interface ColumnCtx {
  id: string;
}
const ColumnContext = React.createContext<ColumnCtx | null>(null);

export const Kanban = React.forwardRef<HTMLDivElement, KanbanProps>(
  function Kanban({ className, onMove, children, ...rest }, ref) {
    const [draggingId, setDragging] = React.useState<string | null>(null);
    const [draggingFrom, setDraggingFrom] = React.useState<string | null>(null);
    const [hoverCol, setHoverCol] = React.useState<string | null>(null);

    return (
      <KanbanContext.Provider
        value={{
          draggingId,
          setDragging,
          draggingFrom,
          setDraggingFrom,
          onMove,
          hoverCol,
          setHoverCol,
        }}
      >
        <div
          ref={ref}
          role="region"
          aria-label="Kanban board"
          className={cn(
            "ds-flex ds-flex-row ds-gap-[var(--ds-spacing-4)] ds-overflow-x-auto",
            "ds-p-[var(--ds-spacing-2)]",
            className,
          )}
          {...rest}
        >
          {children}
        </div>
      </KanbanContext.Provider>
    );
  },
);

export const KanbanColumn = React.forwardRef<HTMLDivElement, KanbanColumnProps>(
  function KanbanColumn(
    { className, id, title, count, children, ...rest },
    ref,
  ) {
    const ctx = React.useContext(KanbanContext);
    const isHover = ctx?.hoverCol === id;

    return (
      <ColumnContext.Provider value={{ id }}>
        <div
          ref={ref}
          className={cn(
            "ds-flex ds-flex-col ds-gap-[var(--ds-spacing-2)]",
            "ds-min-w-[var(--ds-spacing-72)] ds-max-w-[var(--ds-spacing-80)]",
            "ds-p-[var(--ds-spacing-3)] ds-rounded-[var(--ds-radius-card)]",
            "ds-bg-[var(--ds-surface-sunken)]",
            "ds-border ds-border-solid ds-border-[var(--ds-border-subtle)]",
            "ds-transition-colors",
            isHover ? "ds-border-[var(--ds-border-accent)]" : "",
            className,
          )}
          onDragOver={(e) => {
            e.preventDefault();
            ctx?.setHoverCol(id);
          }}
          onDragLeave={() => ctx?.setHoverCol(null)}
          onDrop={(e) => {
            e.preventDefault();
            const cardId = ctx?.draggingId;
            const fromCol = ctx?.draggingFrom;
            ctx?.setHoverCol(null);
            ctx?.setDragging(null);
            ctx?.setDraggingFrom(null);
            if (cardId && fromCol) {
              ctx?.onMove?.(cardId, fromCol, id, 0);
            }
          }}
          {...rest}
        >
          <header className="ds-flex ds-items-center ds-justify-between">
            <span
              style={{
                fontSize: "var(--ds-font-size-body-sm)",
                fontWeight:
                  "var(--ds-font-weight-semibold)" as React.CSSProperties["fontWeight"],
                color: "var(--ds-text-primary)",
              }}
            >
              {title}
            </span>
            {typeof count === "number" ? (
              <span
                style={{
                  fontSize: "var(--ds-font-size-caption)",
                  color: "var(--ds-text-muted)",
                  background: "var(--ds-surface-raised)",
                  padding: "0 var(--ds-spacing-2)",
                  borderRadius: "var(--ds-radius-pill)",
                }}
              >
                {count}
              </span>
            ) : null}
          </header>
          <div className="ds-flex ds-flex-col ds-gap-[var(--ds-spacing-2)] ds-min-h-[var(--ds-spacing-16)]">
            {children}
            {isHover && ctx?.draggingFrom !== id ? (
              <div
                aria-hidden
                className="ds-rounded-[var(--ds-radius-md)] ds-h-[var(--ds-spacing-10)]"
                style={{
                  border: "2px dashed var(--ds-border-accent)",
                  background: "var(--ds-bg-accent-soft)",
                }}
              />
            ) : null}
          </div>
        </div>
      </ColumnContext.Provider>
    );
  },
);

export const KanbanCard = React.forwardRef<HTMLDivElement, KanbanCardProps>(
  function KanbanCard({ className, id, children, ...rest }, ref) {
    const ctx = React.useContext(KanbanContext);
    const col = React.useContext(ColumnContext);
    const isDragging = ctx?.draggingId === id;

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", id);
          ctx?.setDragging(id);
          if (col) ctx?.setDraggingFrom(col.id);
        }}
        onDragEnd={() => {
          ctx?.setDragging(null);
          ctx?.setDraggingFrom(null);
          ctx?.setHoverCol(null);
        }}
        className={cn(
          "ds-cursor-grab active:ds-cursor-grabbing",
          "ds-rounded-[var(--ds-radius-card)]",
          "ds-bg-[var(--ds-card-bg)] ds-text-[var(--ds-text-primary)]",
          "ds-border ds-border-solid ds-border-[var(--ds-card-border)]",
          "ds-p-[var(--ds-spacing-3)]",
          "ds-transition-shadow hover:ds-shadow-[var(--ds-card-shadow-hover)]",
          isDragging ? "ds-opacity-50" : "",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
