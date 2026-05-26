"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";

import type {
  TableProps,
  TableSize,
  TbodyProps,
  TdProps,
  TfootProps,
  TheadProps,
  ThProps,
  TrProps,
} from "./table.types";
import { tableVariants, tdSizePadding } from "./table.variants";

interface TableCtx {
  variant: NonNullable<TableProps["variant"]>;
  size: TableSize;
  stickyHeader: boolean;
}

const TableContext = React.createContext<TableCtx>({
  variant: "default",
  size: "md",
  stickyHeader: false,
});

function alignToTextAlign(
  align?: "start" | "center" | "end",
): React.CSSProperties["textAlign"] {
  if (align === "center") return "center";
  if (align === "end") return "right";
  return "left";
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  function Table(
    {
      className,
      variant = "default",
      size = "md",
      stickyHeader = false,
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <TableContext.Provider value={{ variant, size, stickyHeader }}>
        <table
          ref={ref}
          className={cn(tableVariants({ variant, size }), className)}
          {...rest}
        >
          {children}
        </table>
      </TableContext.Provider>
    );
  },
);

export const Thead = React.forwardRef<HTMLTableSectionElement, TheadProps>(
  function Thead({ className, style, ...rest }, ref) {
    const { stickyHeader } = React.useContext(TableContext);
    return (
      <thead
        ref={ref}
        className={cn(
          "ds-text-[var(--ds-text-muted)]",
          "ds-bg-[var(--ds-surface-raised)]",
          className,
        )}
        style={
          stickyHeader
            ? { position: "sticky", top: 0, zIndex: 1, ...style }
            : style
        }
        {...rest}
      />
    );
  },
);

export const Tbody = React.forwardRef<HTMLTableSectionElement, TbodyProps>(
  function Tbody({ className, ...rest }, ref) {
    return <tbody ref={ref} className={cn(className)} {...rest} />;
  },
);

export const Tfoot = React.forwardRef<HTMLTableSectionElement, TfootProps>(
  function Tfoot({ className, ...rest }, ref) {
    return (
      <tfoot
        ref={ref}
        className={cn(
          "ds-text-[var(--ds-text-muted)]",
          "ds-bg-[var(--ds-surface-raised)]",
          className,
        )}
        {...rest}
      />
    );
  },
);

export const Tr = React.forwardRef<HTMLTableRowElement, TrProps>(function Tr(
  { className, selected, interactive, ...rest },
  ref,
) {
  const { variant } = React.useContext(TableContext);
  return (
    <tr
      ref={ref}
      data-selected={selected ? "true" : undefined}
      data-interactive={interactive ? "true" : undefined}
      className={cn(
        "ds-border-b ds-border-solid ds-border-[var(--ds-border-subtle)]",
        "ds-transition-colors",
        variant === "striped"
          ? "even:ds-bg-[var(--ds-surface-sunken)]"
          : "",
        interactive
          ? "ds-cursor-pointer hover:ds-bg-[var(--ds-bg-muted)]"
          : "",
        selected ? "ds-bg-[var(--ds-bg-accent-soft)]" : "",
        className,
      )}
      {...rest}
    />
  );
});

export const Th = React.forwardRef<HTMLTableCellElement, ThProps>(function Th(
  { className, sortable, direction = "none", align, style, children, ...rest },
  ref,
) {
  const { size, variant } = React.useContext(TableContext);
  const pad = tdSizePadding[size];
  const sortLabel =
    direction === "asc"
      ? "sorted ascending"
      : direction === "desc"
        ? "sorted descending"
        : undefined;

  return (
    <th
      ref={ref}
      scope="col"
      aria-sort={
        direction === "asc"
          ? "ascending"
          : direction === "desc"
            ? "descending"
            : sortable
              ? "none"
              : undefined
      }
      className={cn(
        "ds-font-semibold ds-text-left",
        variant === "bordered"
          ? "ds-border ds-border-solid ds-border-[var(--ds-border-default)]"
          : "",
        sortable ? "ds-cursor-pointer ds-select-none" : "",
        className,
      )}
      style={{
        padding: `${pad} ${pad}`,
        textAlign: alignToTextAlign(align),
        ...style,
      }}
      {...rest}
    >
      <span className="ds-inline-flex ds-items-center ds-gap-[var(--ds-spacing-1)]">
        {children}
        {sortable ? (
          <span
            aria-hidden
            style={{ fontSize: "0.75em", opacity: direction === "none" ? 0.4 : 1 }}
          >
            {direction === "desc" ? "▼" : direction === "asc" ? "▲" : "↕"}
          </span>
        ) : null}
        {sortLabel ? <span className="ds-sr-only">{sortLabel}</span> : null}
      </span>
    </th>
  );
});

export const Td = React.forwardRef<HTMLTableCellElement, TdProps>(function Td(
  { className, align, numeric, style, ...rest },
  ref,
) {
  const { size, variant } = React.useContext(TableContext);
  const pad = tdSizePadding[size];
  return (
    <td
      ref={ref}
      className={cn(
        variant === "bordered"
          ? "ds-border ds-border-solid ds-border-[var(--ds-border-subtle)]"
          : "",
        numeric ? "ds-font-[var(--ds-font-family-mono)] ds-tabular-nums" : "",
        className,
      )}
      style={{
        padding: `${pad} ${pad}`,
        textAlign: alignToTextAlign(align ?? (numeric ? "end" : "start")),
        ...style,
      }}
      {...rest}
    />
  );
});
