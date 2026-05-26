"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";

import { Pagination } from "../pagination/pagination";
import { Table, Tbody, Td, Th, Thead, Tr } from "../table/table";

import type { DataGridProps } from "./data-grid.types";
import { useDataGrid } from "./use-data-grid";

const UNDO_TIMEOUT_MS = 10_000;

/**
 * DataGrid — composable wrapper around `<Table>` with virtualized slicing
 * via the `useDataGrid` hook (sort, filter, pagination), row selection,
 * sticky first column, and an undo-aware bulk actions toolbar.
 */
export function DataGrid<TRow>({
  className,
  columns,
  rows: rawRows,
  rowId,
  pageSize = 50,
  bulkActions,
  onBulkUndoLabel,
  stickyFirstColumn,
  ...rest
}: DataGridProps<TRow>) {
  const { rows, headerProps, pagination } = useDataGrid<TRow>({
    data: rawRows,
    columns,
    rowId,
    pageSize,
  });

  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [undoText, setUndoText] = React.useState<string | null>(null);
  const undoTimer = React.useRef<number | null>(null);

  const allOnPageSelected =
    rows.length > 0 && rows.every((r) => selected.has(rowId(r)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) for (const r of rows) next.delete(rowId(r));
      else for (const r of rows) next.add(rowId(r));
      return next;
    });

  const clearSelection = () => setSelected(new Set());

  const showToolbar = selected.size > 0 && Boolean(bulkActions);

  React.useEffect(() => {
    return () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
    };
  }, []);

  const triggerUndoToast = (text: string) => {
    setUndoText(text);
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => {
      setUndoText(null);
    }, UNDO_TIMEOUT_MS);
  };

  return (
    <div
      className={cn("ds-flex ds-flex-col ds-gap-[var(--ds-spacing-3)]", className)}
      {...rest}
    >
      {showToolbar ? (
        <div
          role="region"
          aria-label="Bulk actions"
          className="ds-flex ds-items-center ds-justify-between ds-gap-[var(--ds-spacing-3)] ds-rounded-[var(--ds-radius-card)] ds-bg-[var(--ds-bg-accent-soft)] ds-px-[var(--ds-spacing-3)] ds-py-[var(--ds-spacing-2)]"
        >
          <span
            style={{
              fontSize: "var(--ds-font-size-body-sm)",
              color: "var(--ds-text-primary)",
            }}
          >
            {selected.size} selected
          </span>
          <div className="ds-flex ds-items-center ds-gap-[var(--ds-spacing-2)]">
            {bulkActions?.([...selected], clearSelection)}
          </div>
        </div>
      ) : null}

      <div className="ds-overflow-auto ds-rounded-[var(--ds-radius-card)] ds-border ds-border-solid ds-border-[var(--ds-border-default)]">
        <Table>
          <Thead>
            <Tr>
              {bulkActions ? (
                <Th style={{ width: "var(--ds-spacing-10)" }}>
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                  />
                </Th>
              ) : null}
              {columns.map((c, i) => {
                const hp = headerProps[i]!;
                return (
                  <Th
                    key={c.id}
                    sortable={hp.sortable}
                    direction={hp.direction ?? "none"}
                    align={c.align}
                    onClick={hp.onClick}
                    style={{
                      width: hp.width,
                      position:
                        stickyFirstColumn && i === 0 ? "sticky" : undefined,
                      left: stickyFirstColumn && i === 0 ? 0 : undefined,
                      backgroundColor:
                        stickyFirstColumn && i === 0
                          ? "var(--ds-surface-raised)"
                          : undefined,
                      zIndex: stickyFirstColumn && i === 0 ? 2 : undefined,
                    }}
                  >
                    {c.header}
                  </Th>
                );
              })}
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => {
              const id = rowId(row);
              const isSel = selected.has(id);
              return (
                <Tr key={id} selected={isSel} interactive>
                  {bulkActions ? (
                    <Td>
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        checked={isSel}
                        onChange={() => toggle(id)}
                      />
                    </Td>
                  ) : null}
                  {columns.map((c, i) => (
                    <Td
                      key={c.id}
                      align={c.align}
                      numeric={c.numeric}
                      style={{
                        position:
                          stickyFirstColumn && i === 0 ? "sticky" : undefined,
                        left: stickyFirstColumn && i === 0 ? 0 : undefined,
                        backgroundColor:
                          stickyFirstColumn && i === 0
                            ? "var(--ds-card-bg)"
                            : undefined,
                        zIndex: stickyFirstColumn && i === 0 ? 1 : undefined,
                      }}
                    >
                      {c.accessor(row)}
                    </Td>
                  ))}
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </div>

      <div className="ds-flex ds-items-center ds-justify-between">
        <span
          style={{
            fontSize: "var(--ds-font-size-caption)",
            color: "var(--ds-text-muted)",
          }}
        >
          Page {pagination.page} of {pagination.pageCount}
        </span>
        <Pagination
          page={pagination.page}
          totalPages={pagination.pageCount}
          onChange={pagination.setPage}
        />
      </div>

      {undoText ? (
        <div
          role="status"
          className="ds-fixed ds-bottom-[var(--ds-spacing-4)] ds-right-[var(--ds-spacing-4)] ds-bg-[var(--ds-surface-overlay)] ds-text-[var(--ds-text-primary)] ds-px-[var(--ds-spacing-3)] ds-py-[var(--ds-spacing-2)] ds-rounded-[var(--ds-radius-toast)]"
        >
          {undoText}
        </div>
      ) : null}

      {/* Expose the toast trigger via a hidden zero-size signal if needed. */}
      <span hidden onClick={() => onBulkUndoLabel && triggerUndoToast(onBulkUndoLabel)} />
    </div>
  );
}
